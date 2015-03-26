class Status(object):
    active_visible = 'active_visible'
    active = 'active'
    visible = 'visible'
    review = 'review'
    inactive = 'inactive'


class ModuleItem(object):
    def __init__(self, resource_uri, properties, client=None):
        self._client = client
        self.properties = properties
        self.resource_uri = resource_uri

    def __getattr__(self, attr):
        if attr in self.properties:
            return self.properties[attr]

    @property
    def status(self):
        return self.properties['status']

    @status.setter
    def status(self, value):
        self._client.publisher_command('course', 'set_module_item_status', {
            'items': [self.id],
            'status': value,
        })
        self.properties['status'] = value

    @classmethod
    def fetch(klass, client, resource_uri):
        response = client.authenticated_request('get', resource_uri)
        return klass(resource_uri, response.json(), client=client)
