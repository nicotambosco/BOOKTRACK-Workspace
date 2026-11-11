from django.test import TestCase
from rest_framework.test import APIClient

from .testing import make_user


class ProfileImageTests(TestCase):
    def test_profile_accepts_data_uri_image(self):
        user = make_user('PROFILE-1', password='test-pass')
        client = APIClient()
        client.force_authenticate(user)
        image = 'data:image/png;base64,iVBORw0KGgo='

        response = client.patch(f'/api/users/{user.pk}/', {'imagen': image}, format='json')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.imagen, image)
