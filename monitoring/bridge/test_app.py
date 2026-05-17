import asyncio

import pytest

import app as bridge_app


class FakeRequest:
    def __init__(self, payload):
        self._payload = payload

    async def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


def test_alertmanager_rejects_invalid_json(monkeypatch):
    monkeypatch.setattr(bridge_app, 'DISCORD_WEBHOOK_URL', 'https://discord.example/webhook')

    with pytest.raises(bridge_app.HTTPException) as exc:
        asyncio.run(bridge_app.alertmanager(FakeRequest(ValueError('bad json'))))

    assert exc.value.status_code == 400
    assert exc.value.detail == 'Invalid JSON body'


def test_alertmanager_rejects_malformed_payload(monkeypatch):
    monkeypatch.setattr(bridge_app, 'DISCORD_WEBHOOK_URL', 'https://discord.example/webhook')

    with pytest.raises(bridge_app.HTTPException) as exc:
        asyncio.run(bridge_app.alertmanager(FakeRequest({'alerts': 'not-a-list'})))

    assert exc.value.status_code == 400
    assert isinstance(exc.value.detail, list)
    assert exc.value.detail[0]['loc'] == ('alerts',)
