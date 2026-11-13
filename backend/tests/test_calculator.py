import math


def test_basic_arithmetic(client):
    resp = client.post("/api/v1/calculate", json={"expression": "2 + 3 * 4"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["result"] == 14


def test_scientific_function_sin(client):
    resp = client.post("/api/v1/calculate", json={"expression": "sin(0)"})
    assert resp.status_code == 200
    assert resp.json()["result"] == 0


def test_scientific_function_log(client):
    resp = client.post("/api/v1/calculate", json={"expression": "log(100)"})
    assert resp.status_code == 200
    assert math.isclose(resp.json()["result"], 2.0, rel_tol=1e-9)


def test_constant_pi(client):
    resp = client.post("/api/v1/calculate", json={"expression": "pi"})
    assert resp.status_code == 200
    assert math.isclose(resp.json()["result"], math.pi, rel_tol=1e-9)


def test_divide_by_zero_returns_error(client):
    resp = client.post("/api/v1/calculate", json={"expression": "5 / 0"})
    assert resp.status_code == 400
    assert "zero" in resp.json()["detail"].lower()


def test_invalid_expression_rejected(client):
    resp = client.post("/api/v1/calculate", json={"expression": "__import__('os')"})
    assert resp.status_code == 400


def test_empty_expression_rejected(client):
    resp = client.post("/api/v1/calculate", json={"expression": ""})
    assert resp.status_code == 400


def test_health_still_ok(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
