import unittest
import os
import json
import sqlite3
import database
from app import app

class FinchCRMTestCase(unittest.TestCase):
    def setUp(self):
        # Set up a test database
        database.DB_PATH = 'test_collectors.db'
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret'
        self.app = app.test_client()
        database.init_db()

    def tearDown(self):
        # Clean up database file
        if os.path.exists('test_collectors.db'):
            try:
                os.remove('test_collectors.db')
            except OSError:
                pass

    def test_signup_page(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'JOE FINCH', response.data)

    def test_admin_redirect_to_login(self):
        # Admin is password protected by default
        response = self.app.get('/admin')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Passcode Required', response.data)

    def test_admin_login_success(self):
        response = self.app.post('/admin/login', json={'password': 'finch2026'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])

    def test_admin_login_fail(self):
        response = self.app.post('/admin/login', json={'password': 'wrongpassword'})
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertFalse(data['success'])

    def test_create_collector_validation(self):
        # 1. Successful signup with name and phone (email optional)
        payload = {
            'name': 'Phone Only Collector',
            'phone': '1234567890',
            'source': 'QR Visitor'
        }
        res = self.app.post('/api/collectors', json=payload)
        self.assertEqual(res.status_code, 201)
        
        # 2. Successful signup with name, phone and email
        payload = {
            'name': 'Full Contact Collector',
            'phone': '0987654321',
            'email': 'email@example.com',
            'source': 'QR Visitor'
        }
        res = self.app.post('/api/collectors', json=payload)
        self.assertEqual(res.status_code, 201)
        
        # 3. Failing signup with missing phone number (phone required)
        payload = {
            'name': 'No Phone Collector',
            'email': 'email@example.com',
            'source': 'QR Visitor'
        }
        res = self.app.post('/api/collectors', json=payload)
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertEqual(data['error'], 'Phone number is required.')

    def test_artworks_api(self):
        self.app.post('/admin/login', json={'password': 'finch2026'})
        
        # 1. Create Artwork
        payload = {
            'title': 'Test Artwork',
            'category': 'Sculpture',
            'price': 5000,
            'availability': 'Available'
        }
        res = self.app.post('/api/artworks', json=payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        art_id = data['id']
        
        # Verify columns updated_at and active
        conn = database.get_db()
        row = conn.execute("SELECT * FROM artworks WHERE id = ?", (art_id,)).fetchone()
        conn.close()
        self.assertEqual(row['active'], 1)
        self.assertIsNotNone(row['updated_at'])
        
        # 2. Update via PATCH REST verb
        res = self.app.patch(f'/api/artworks/{art_id}', json={'availability': 'Sold'})
        self.assertEqual(res.status_code, 200)

    def test_events_api(self):
        self.app.post('/admin/login', json={'password': 'finch2026'})
        
        payload = {
            'name': 'Test Rotterdam Fair',
            'location': 'Rotterdam Hall 4',
            'start_date': '2026-04-10',
            'end_date': '2026-04-15'
        }
        res = self.app.post('/api/events', json=payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        ev_id = data['id']
        
        # Verify columns exist
        conn = database.get_db()
        row = conn.execute("SELECT * FROM events WHERE id = ?", (ev_id,)).fetchone()
        conn.close()
        self.assertEqual(row['location'], 'Rotterdam Hall 4')
        self.assertEqual(row['start_date'], '2026-04-10')
        self.assertEqual(row['end_date'], '2026-04-15')
        self.assertEqual(row['active'], 1)
        self.assertIsNotNone(row['updated_at'])
        
        # Update event via PATCH
        res = self.app.patch(f'/api/events/{ev_id}', json={'location': 'New Hall 5'})
        self.assertEqual(res.status_code, 200)
        
        # Check database update
        conn = database.get_db()
        row = conn.execute("SELECT * FROM events WHERE id = ?", (ev_id,)).fetchone()
        conn.close()
        self.assertEqual(row['location'], 'New Hall 5')

    def test_staff_api(self):
        self.app.post('/admin/login', json={'password': 'finch2026'})
        
        res = self.app.post('/api/staff', json={'name': 'Sarah Staff', 'email': 'sarah@finch.com'})
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        sid = data['id']
        
        # Verify updated_at
        conn = database.get_db()
        row = conn.execute("SELECT * FROM staff WHERE id = ?", (sid,)).fetchone()
        conn.close()
        self.assertIsNotNone(row['updated_at'])
        
        # Update active status via PATCH
        res = self.app.patch(f'/api/staff/{sid}', json={'active': 0})
        self.assertEqual(res.status_code, 200)

    def test_duplicate_warning_staff(self):
        self.app.post('/admin/login', json={'password': 'finch2026'})
        
        payload = {
            'name': 'Dupe Test',
            'email': 'dupe@example.com',
            'phone': '111222333',
            'source': 'Staff Input'
        }
        res = self.app.post('/api/collectors', json=payload)
        self.assertEqual(res.status_code, 201)
        
        # Duplicate match on email -> returns 409
        res = self.app.post('/api/collectors', json=payload)
        self.assertEqual(res.status_code, 409)
        
        # Duplicate override via force=True succeeds
        payload['force'] = True
        res = self.app.post('/api/collectors', json=payload)
        self.assertEqual(res.status_code, 201)

    def test_update_collector_relational(self):
        self.app.post('/admin/login', json={'password': 'finch2026'})
        
        art_id = database.add_artwork(title='Mona Lisa')
        ev_id = database.add_event(name='Louvre Opening')
        st_id = database.add_staff(name='Leonardo')
        
        cid = database.add_collector(name='Relational Collector', email='rel@example.com')
        
        # Update via PATCH
        res = self.app.patch(f'/api/collectors/{cid}', json={
            'artwork_id': art_id,
            'event_id': ev_id,
            'staff_id': st_id,
            'interest_level': 'Very High',
            'status': 'Active'
        })
        self.assertEqual(res.status_code, 200)
        
        # Verify database update
        c = database.get_collector_by_id(cid)
        self.assertEqual(c['artwork_title'], 'Mona Lisa')
        self.assertEqual(c['event_name'], 'Louvre Opening')
        self.assertEqual(c['staff_name'], 'Leonardo')
        self.assertIsNotNone(c['updated_at'])

if __name__ == '__main__':
    unittest.main()
