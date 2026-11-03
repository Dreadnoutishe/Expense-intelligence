from concurrent.futures import ThreadPoolExecutor
from test_app import client, add, CSV


def test_malformed_row_width_and_quoted_fields(client):
    content = (
        "date,description,amount,type\n"
        "2026-01-01,Too many,12,expense,EXTRA\n"
        "2026-01-02,Too few,12\n"
        '2026-01-03,"Cafe, with friends",12.30,expense\n'
    )
    result = client.post(
        "/api/transactions/import/preview",
        files={"file": ("test.csv", content, "text/csv")},
    )
    assert result.status_code == 200
    assert [r["status"] for r in result.json()["rows"]] == [
        "invalid",
        "invalid",
        "valid",
    ]
    assert client.post(
        "/api/transactions/import/confirm", json={"csv": content}
    ).json() == dict(imported=1, skipped=0, rejected=2)
    assert (
        client.post(
            "/api/transactions/import/confirm",
            json={
                "csv": 'date,description,amount,type\n2026-01-01,"unterminated,12,expense'
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/transactions/import/confirm",
            json={"csv": "date,date,description,amount,type\n"},
        ).status_code
        == 422
    )


def test_income_does_not_consume_budget_and_leap_year(client):
    add(client, date="2024-02-29", description="Cafe lunch", amount="29.00")
    add(
        client,
        date="2024-02-01",
        description="Refund",
        category="Food",
        type="income",
        amount="100",
    )
    budget = client.post(
        "/api/budgets", json=dict(month="2024-02", category="Food", amount="100")
    ).json()
    assert budget["spent_cents"] == 2900
    assert budget["utilization"] == 29
    totals = client.get("/api/analytics/summary?month=2024-02").json()
    assert totals["daily_average_cents"] == 100
    assert totals["income_cents"] == 10000
    assert (
        client.get("/api/analytics/categories?month=2024-02").json()[0]["amount_cents"]
        == 2900
    )


def test_rewards_survive_record_deletion(client):
    transaction = add(client).json()
    assert client.get("/api/achievements").json()["xp"] == 50
    client.delete(f"/api/transactions/{transaction['id']}")
    assert client.get("/api/achievements").json()["xp"] == 50
    add(client)
    assert client.get("/api/achievements").json()["xp"] == 50


def test_concurrent_imports_are_serialized(client):
    def confirm(_):
        return client.post("/api/transactions/import/confirm", json={"csv": CSV})

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(confirm, range(2)))
    assert all(r.status_code == 200 for r in responses)
    assert sorted(r.json()["imported"] for r in responses) == [0, 2]
    assert len(client.get("/api/transactions").json()) == 2
    assert client.get("/api/achievements").json()["xp"] == 150


def test_category_override_and_duplicate_after_recategorizing(client):
    first = add(client, category="Health").json()
    assert first["category"] == "Health"
    assert add(client, category="Transport").status_code == 409
    response = client.put(
        f"/api/transactions/{first['id']}",
        json=dict(
            date="2026-02-10",
            description="Cafe lunch",
            amount="12.30",
            type="expense",
            category="Education",
        ),
    )
    assert response.status_code == 200
    assert response.json()["category"] == "Education"
