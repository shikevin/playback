import logging
import re
import websocket


class App(object):
    def __init__(self, client):
        self.client = client
        self.remote_control = client.create_remote_control()

    def run(self):
        if logging.getLogger().isEnabledFor(logging.DEBUG):
            websocket.enableTrace(True)

        self.remote_control.connect(
            on_registered=self.on_registered,
            on_message=self.on_message,
        )
        self.remote_control.run_forever()

    def on_registered(self):
        pass

    def on_message(self, message):
        logging.debug(message)
        event = message['event']
        for m in re.finditer(r'^__houdini_resource_update:(.*)', event):
                self.on_resource_update(m.group(1), message)

        if event == 'timer_play':
            self.on_timer_play(message['payload']['id'])
        elif event == 'timer_pause':
            self.on_timer_pause(
                message['payload']['id'], message['payload']['seconds']
            )

    def on_resource_update(self, resource, message):
        if re.match('^report', resource):
            self.on_report_update(resource, message['payload']['data'])

    def on_report_update(self):
        pass

    def on_timer_play(self, module_item_id):
        pass

    def on_timer_pause(self, module_item_id, seconds):
        pass
