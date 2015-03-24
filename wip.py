import requests
import re
import websocket
import json
import uuid
import time

BASE_ENDPOINT = 'https://dev.tophat.com'

import logging

# These two lines enable debugging at httplib level (requests->urllib3->http.client)
# You will see the REQUEST, including HEADERS and DATA, and RESPONSE with HEADERS but without DATA.
# The only thing missing will be the response.body which is not logged.
try:
    import http.client as http_client
except ImportError:
    # Python 2
    import httplib as http_client
http_client.HTTPConnection.debuglevel = 1
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
requests_log = logging.getLogger("requests.packages.urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True


class THAuth(requests.auth.AuthBase):
    def __init__(self, username, api_key):
        self.username = username
        self.api_key = api_key

    def __call__(self, r):
        r.headers.update({
            'API-KEY': self.api_key,
            'username': self.username
        })
        return r


def request(method, url_fragment, **kwargs):
    return requests.request(method, BASE_ENDPOINT + url_fragment, **kwargs)


class THClient(object):
    def __init__(self, auth):
        self.auth = auth

    def create_question(self, title, type='na'):
        return request('post', '/api/v1/question/', auth=self.auth, json={
            'module': 'question',
            'title': title,
            'question': 'what is the answer to life the universe and everything',
            'correct_answer': 42,
            'tolerance': 0,
            'type': type,
            'profile': {'time_limit': 300}
        })


    def set_module_item_status(self, status="visible", items=[]):
        return request('post', '/epublisher/?module=course&command=set_module_item_status', auth=self.auth, data={
            'data': json.dumps([{
                'module_id': 'course',
                'command_id': 'set_module_item_status',
                'command_uuid': str(uuid.uuid1()),
                'timestamp': time.time(),
                'args': {
                    'items': items,
                    'status': status,
                }
            }])
        })

    def create_queue(self):
        return request('get', '/queue', auth=self.auth).json()

    def _socket_uri(self):
        sockjs_app_name = 'v1/socket'
        return request('get', '/meta', auth=self.auth).json()['socket_uri'] + sockjs_app_name + '/websocket'

    def ws_connection(self, **kwargs):
        uri = re.sub('^http', 'ws', self._socket_uri())
        return websocket.WebSocketApp(uri, **kwargs)


class TestApp(object):
    def __init__(self, client):
        self.client = client

    def run(self):
        websocket.enableTrace(True)
        self.ws = self.client.ws_connection(
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
        )
        self.ws.run_forever()

    def on_open(self, ws):
        q = self.client.create_queue()
        print "opened websocket"
        print "subscribing to " + str(q)
        self.emit('register', q)

    def on_message(self, ws, message):
        message = json.loads(message)
        if not 'type' in message:
            return
        if message['type'] == 'message':
            self.on_houdini(ws, message['data'])


    def on_houdini(self, ws, message):
        if re.match(r'^__houdini_resource_update', message['event']):
            self.process_useranswers(message['payload']['data']['All Data'])

    def process_useranswers(self, user_answers):
        print user_answers
        for user, response in user_answers.iteritems():
            if response['answer'] == 'd':
                self.client.set_module_item_status(items=[3])


    def on_error(self, ws, error):
        print "error: " + str(error)

    def emit(self, type, data, event=None):
        blob = {
            'type': type,
            'event': event,
            'data': data,
        }
        self.ws.send(json.dumps(blob))

def run_quick():
    c=THClient(THAuth('martin_prof', '074dbaf578dfb4bf1ea05ab91a7ab4c54da77569'))
    a=TestApp(c)
    a.run()
    return a

run_quick()
