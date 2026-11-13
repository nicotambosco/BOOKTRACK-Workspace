from django.test import TestCase
from rest_framework.test import APIClient

from .testing import make_user


class ProfileImageTests(TestCase):
    def test_user_cannot_replace_profile_image_but_can_update_email(self):
        original_image = 'data:image/png;base64,b3JpZ2luYWw='
        user = make_user('PROFILE-1', imagen=original_image)
        client = APIClient()
        client.force_authenticate(user)
        image = 'data:image/png;base64,iVBORw0KGgo='

        for index, url in enumerate(['/api/users/me/', f'/api/users/{user.pk}/']):
            with self.subTest(url=url):
                email = f'actualizado{index}@example.test'
                response = client.patch(url, {'imagen': image, 'email': email}, format='json')

                self.assertEqual(response.status_code, 200, response.data)
                user.refresh_from_db()
                self.assertEqual(user.imagen, original_image)
                self.assertEqual(response.data['imagen'], original_image)
                self.assertEqual(user.email, email)

    def test_librarian_profile_accepts_data_uri_image(self):
        librarian = make_user('LIB-PROFILE-1', 'bibliotecario')
        client = APIClient()
        client.force_authenticate(librarian)
        images = ['data:image/png;base64,iVBORw0KGgo=', 'data:image/png;base64,b3RyYQ==']

        for url, image in zip(['/api/users/me/', f'/api/users/{librarian.pk}/'], images):
            with self.subTest(url=url):
                response = client.patch(url, {'imagen': image}, format='json')

                self.assertEqual(response.status_code, 200, response.data)
                librarian.refresh_from_db()
                self.assertEqual(librarian.imagen, image)
                self.assertEqual(response.data['imagen'], image)
