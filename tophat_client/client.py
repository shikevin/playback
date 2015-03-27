from auth import Auth
import requests
import json
import uuid
import time
from module_item import ModuleItem
from houdini import RemoteControl


class Client(object):
    def __init__(self, endpoint):
        self.endpoint = endpoint

    def login(self, username, password):
        response = requests.post(self.endpoint + '/auth', data={
            'username': username,
            'password': password,
        })
        response.raise_for_status()
        self.auth = Auth(username, response.text)

    def authenticated_request(self, method, url, **kwargs):
        args = {
            'auth': self.auth,
        }
        args.update(kwargs)
        return requests.request(method, url, **args)

    def request(self, method, url_fragment, **kwargs):
        return self.authenticated_request(
            method, self.endpoint + url_fragment, **kwargs
        )

    def create_question(self, params):
        args = {
            'module': 'question',
            'profile': {'time_limit': 30, 'is_timed': True},
            'active_immediately': True,
        }
        args.update(params)
        response = self.request('post', '/api/v1/question/', json=args)
        return ModuleItem.fetch(self, response.headers['location'])

    def publisher_command(self, module, command, args):
        return self.request(
            'post', '/epublisher/', params={
                'module': module,
                'command': command,
            }, data={
                'data': json.dumps([{
                    'module_id': module,
                    'command_id': command,
                    'command_uuid': str(uuid.uuid1()),
                    'timestamp': time.time(),
                    'args': args
                }])
            })

    def create_word_question(self, title, question, correct_answers):
        return self.create_question({
            'title': title,
            'question': question,
            'choices': correct_answers,
            'type': 'wa',
        })

    def create_queue(self):
        return self.request('get', '/queue').json()

    def create_remote_control(self):
        return RemoteControl(self.sockjs_root, self.create_queue())

    @property
    def sockjs_root(self):
        return self.request('get', '/meta').json()['socket_uri']
