import requests


class Auth(requests.auth.AuthBase):
    def __init__(self, username, api_key):
        self.username = username
        self.api_key = api_key

    def __call__(self, r):
        r.headers.update({
            'API-KEY': self.api_key,
            'username': self.username
        })
        return r
