import websocket
import json
import logging
import re


class Houdini(object):
    def __init__(self, socket_uri, queue):
        self.socket_uri = socket_uri
        self.queue = queue
        self.channels = {}

    def connect(self, **handlers):
        self.handlers = handlers
        self.ws = websocket.WebSocketApp(
            self._websocket_uri,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
        )

    def run_forever(self):
        self.ws.run_forever()

    def on_open(self, ws):
        self.emit(type='register', data=self.queue)

    def on_meta(self, data):
        if data['event'] == 'authorize':
            channel = data['payload']['channel']
            for m in re.finditer(r'^([^\.]+)', channel):
                self.channels[m.group(1)] = channel

    def on_message(self, ws, message):
        logging.debug(message)
        message = json.loads(message)
        if 'type' not in message:
            return
        type = message['type']
        if type == 'meta':
            self.on_meta(message['data'])
            self.dispatch(type, message['data'])
        elif type == 'register-ok':
            self.dispatch('registered')
        elif type == 'message':
            self.dispatch('message', message['data'])

    def dispatch(self, event, *args):
        handler_name = "on_{0}".format(event)
        if handler_name in self.handlers:
            self.handlers[handler_name](*args)

    def on_error(self, ws, error):
        logging.exception(error)

    def emit(self, **data):
        self.ws.send(json.dumps(data))

    def broadcast(self, event, channel, payload={}):
        self.emit(
            type='broadcast',
            data=payload,
            event=event,
            channel=channel,
        )

    @property
    def _websocket_uri(self):
        return re.sub('^http', 'ws', self.socket_uri) + 'v1/socket/websocket'


class RemoteControl(Houdini):
    def show_reports(self, question):
        self.broadcast(
            'active_content_reports',
            self.channels['user'], {
                'module_item_id': question.id,
            }
        )

    def show_answer(self, question):
        self.broadcast(
            'active_content_show_answer',
            self.channels['user'], {
                'module_item_id': question.id,
            }
        )

    def magnify(self):
        self.broadcast('active_content_magnify', self.channels['user'])
