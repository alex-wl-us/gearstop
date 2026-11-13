def test_get_greeting(client):
    response = client.get("/api/v1/greeting")
    assert response.status_code == 200
    data = response.json()
    assert data == {"message": "Hello, World!"}
