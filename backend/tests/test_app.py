import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.services import categorize


@pytest.fixture
def client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path}/test.db", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine)

    def override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    engine.dispose()


def add(client, **kwargs):
    payload = dict(
        date="2026-02-10", description="Cafe lunch", amount="12.30", type="expense"
    )
    payload.update(kwargs)
    return client.post("/api/transactions", json=payload)


@pytest.mark.parametrize(
    "text,category",
    [
        ("STARBUCKS", "Food"),
        ("Uber ride", "Transport"),
        ("NETFLIX", "Entertainment"),
        ("Internet", "Bills"),
        ("unrecognized", "Other"),
    ],
)
def test_categories(text, category):
    assert categorize(text) == category


def test_explicit_category():
    assert categorize("Uber", category="Health") == "Health"


def test_crud_validation_and_duplicates(client):
    response = add(client)
    assert response.status_code == 201
    id = response.json()["id"]
    assert add(client, description=" CAFE  lunch ").status_code == 409
    assert add(client, amount="-2").status_code == 422
    assert add(client, amount="0.001").status_code == 422
    assert add(client, description="   ").status_code == 422
    assert add(client, date="2026-02-30").status_code == 422
    assert (
        client.put(
            f"/api/transactions/{id}",
            json=dict(
                date="2026-02-11", description="Taxi", amount="4.56", type="expense"
            ),
        ).status_code
        == 200
    )
    assert (
        client.get("/api/transactions?search=taxi&sort=amount_asc").json()[0][
            "category"
        ]
        == "Transport"
    )
    assert client.delete(f"/api/transactions/{id}").status_code == 204
    assert client.get("/api/transactions").json() == []
    assert client.delete(f"/api/transactions/{id}").status_code == 404


def test_analytics_boundaries_and_budget(client):
    add(client, amount="12.30")
    add(client, description="Pay", amount="1000.00", type="income")
    add(client, date="2026-03-01", description="Cafe", amount="99")
    add(client, date="2026-01-31", description="Cafe", amount="10")
    b = client.post(
        "/api/budgets", json=dict(month="2026-02", category="Food", amount="10")
    )
    assert b.status_code == 201
    assert b.json()["utilization"] == 123
    assert b.json()["remaining_cents"] == -230
    summary = client.get("/api/analytics/summary?month=2026-02").json()
    assert summary["expenses_cents"] == 1230
    assert summary["income_cents"] == 100000
    assert summary["net_cents"] == 98770
    assert summary["change_percent"] == 23
    assert summary["budget_utilization"] == 123
    assert summary["daily_average_cents"] == 44
    assert (
        client.get("/api/analytics/summary?month=2025-12").json()["change_percent"]
        is None
    )
    assert client.get("/api/analytics/summary?month=2026-13").status_code == 422
    assert client.get("/api/analytics/summary?month=0000-01").status_code == 422
    assert len(client.get("/api/analytics/trends?month=2026-02").json()) == 6
    assert (
        client.post(
            "/api/budgets", json=dict(month="2026-02", category="Food", amount="10")
        ).status_code
        == 409
    )
    assert (
        client.put(
            f"/api/budgets/{b.json()['id']}",
            json=dict(month="2026-02", category="Food", amount="20"),
        ).json()["utilization"]
        == 61.5
    )


CSV = "date,description,merchant,amount,type,category\n2026-02-10,Cafe lunch,,12.30,expense,\n2026-02-10,CAFE  lunch,,12.30,expense,Food\n2026-02-11,Metro,,2.50,expense,\nwrong,Oops,,-3,expense,\n"


def test_csv_preview_confirm_replay(client):
    preview = client.post(
        "/api/transactions/import/preview",
        files={"file": ("sample.csv", CSV, "text/csv")},
    )
    assert preview.status_code == 200
    assert [r["status"] for r in preview.json()["rows"]] == [
        "valid",
        "duplicate",
        "valid",
        "invalid",
    ]
    result = client.post("/api/transactions/import/confirm", json={"csv": CSV})
    assert result.json() == dict(imported=2, skipped=1, rejected=1)
    assert client.post(
        "/api/transactions/import/confirm", json={"csv": CSV}
    ).json() == dict(imported=0, skipped=3, rejected=1)
    assert (
        client.post(
            "/api/transactions/import/preview",
            files={"file": ("bad.csv", "foo\nbar", "text/csv")},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/transactions/import/confirm", json={"csv": "invalid"}
        ).status_code
        == 422
    )
    assert client.get("/api/achievements").json()["xp"] == 150


def test_achievements_one_time_and_completed_month(client):
    assert client.get("/api/achievements").json()["xp"] == 0
    # A future budget cannot qualify for Smart Saver.
    client.post(
        "/api/budgets", json=dict(month="2099-01", category="Food", amount="100")
    )
    assert client.get("/api/achievements").json()["xp"] == 75
    for i in range(10):
        add(client, date=f"2020-01-{i+1:02}", description=f"Cafe {i}", amount="1")
    assert client.get("/api/achievements").json()["xp"] == 325
    client.post(
        "/api/budgets", json=dict(month="2020-01", category="Food", amount="10")
    )
    result = client.get("/api/achievements").json()
    assert result["xp"] == 475
    for _ in range(3):
        assert client.get("/api/achievements").json()["xp"] == 475
    assert sum(a["unlocked"] for a in result["achievements"]) == 5


def test_saver_rejects_exceeded_or_empty_month(client):
    client.post("/api/budgets", json=dict(month="2020-01", category="Food", amount="5"))
    assert not next(
        a
        for a in client.get("/api/achievements").json()["achievements"]
        if a["key"] == "saver"
    )["unlocked"]
    add(client, date="2020-01-01", amount="6")
    assert not next(
        a
        for a in client.get("/api/achievements").json()["achievements"]
        if a["key"] == "saver"
    )["unlocked"]
