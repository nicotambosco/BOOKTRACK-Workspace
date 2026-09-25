from django.test import TestCase
from rest_framework.test import APIClient

from .models import User


class ProfileImageTests(TestCase):
    def test_profile_accepts_data_uri_image(self):
        user = User.objects.create_user(username='profile-test', password='test-pass', legajo='PROFILE-1')
        client = APIClient()
        client.force_authenticate(user)
        image = 'data:image/png;base64,iVBORw0KGgo='

        response = client.patch(f'/api/users/{user.id}/', {'imagen': image}, format='json')

        self.assertEqual(response.status_code, 200)
        user.refresh_from_db()
        self.assertEqual(user.imagen, image)
