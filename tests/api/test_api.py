import copy
from fastapi.testclient import TestClient
import pytest

from src import app as appmod


client = TestClient(appmod.app)


@pytest.fixture(autouse=True)
def reset_activities():
    # Preserve the original in-memory activities and restore after each test
    original = copy.deepcopy(appmod.activities)
    yield
    appmod.activities.clear()
    appmod.activities.update(copy.deepcopy(original))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # check a known activity exists
    assert "Chess Club" in data


def test_signup_adds_participant():
    activity = "Programming Class"
    email = "test.student@mergington.edu"

    # ensure not present
    assert email not in appmod.activities[activity]["participants"]

    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")

    # backend state should reflect the new participant
    assert email in appmod.activities[activity]["participants"]


def test_delete_removes_participant():
    activity = "Chess Club"
    email = "temp.remove@mergington.edu"

    # add participant directly
    appmod.activities[activity]["participants"].append(email)
    assert email in appmod.activities[activity]["participants"]

    resp = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Removed" in body.get("message", "")

    # ensure it's gone
    assert email not in appmod.activities[activity]["participants"]
