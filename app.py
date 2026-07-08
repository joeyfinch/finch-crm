import os
import csv
import io
from flask import Flask, render_template, request, jsonify, make_response, redirect, url_for, session
import database

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'finch-secret-key-192837465')

# Default admin password is 'finch2026' if not set in environment
ADMIN_PASSWORD = os.environ.get('FINCH_ADMIN_PASSWORD', 'finch2026')

@app.before_request
def initialize():
    database.init_db()

@app.route('/')
def signup_page():
    return render_template('signup.html')

@app.route('/admin')
def admin_page():
    # If password is set, verify authorization
    if ADMIN_PASSWORD:
        if not session.get('authorized'):
            return render_template('login.html')
    return render_template('admin.html')

@app.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.json or {}
    password = data.get('password')
    if password == ADMIN_PASSWORD:
        session['authorized'] = True
        return jsonify({'success': True})
    return jsonify({'success': False, 'message': 'Invalid passcode'}), 401

@app.route('/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('authorized', None)
    return jsonify({'success': True})

# ==========================================================================
# Artwork REST APIs
# ==========================================================================
@app.route('/api/artworks', methods=['GET'])
def get_artworks():
    artworks = database.get_all_artworks()
    return jsonify(artworks)

@app.route('/api/artworks', methods=['POST'])
def create_artwork():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    title = data.get('title')
    category = data.get('category')
    availability = data.get('availability', 'Available')
    price = data.get('price')
    active = data.get('active', 1)
    if not title:
        return jsonify({'error': 'Title is required'}), 400
    try:
        if price is not None and price != '':
            price = float(price)
        else:
            price = None
    except ValueError:
        return jsonify({'error': 'Price must be a number'}), 400
        
    new_id = database.add_artwork(title, category, availability, price, int(active))
    return jsonify({'success': True, 'id': new_id}), 201

@app.route('/api/artworks/<int:artwork_id>', methods=['PUT', 'PATCH'])
def edit_artwork(artwork_id):
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    allowed_updates = {}
    for field in ['title', 'category', 'availability', 'price', 'active']:
        if field in data:
            allowed_updates[field] = data[field]
    if 'price' in allowed_updates and allowed_updates['price'] is not None and allowed_updates['price'] != '':
        try:
            allowed_updates['price'] = float(allowed_updates['price'])
        except ValueError:
            return jsonify({'error': 'Price must be a number'}), 400
    if not allowed_updates:
        return jsonify({'error': 'No fields to update'}), 400
        
    success = database.update_artwork(artwork_id, allowed_updates)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Artwork not found or no changes made'}), 404

# ==========================================================================
# Event REST APIs
# ==========================================================================
@app.route('/api/events', methods=['GET'])
def get_events():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    events = database.get_all_events()
    return jsonify(events)

@app.route('/api/events', methods=['POST'])
def create_event():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    name = data.get('name')
    location = data.get('location')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    active = data.get('active', 1)
    if not name:
        return jsonify({'error': 'Event name is required'}), 400
    new_id = database.add_event(name, location, start_date, end_date, int(active))
    return jsonify({'success': True, 'id': new_id}), 201

@app.route('/api/events/<int:event_id>', methods=['PUT', 'PATCH'])
def edit_event(event_id):
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    allowed_updates = {}
    for field in ['name', 'location', 'start_date', 'end_date', 'active']:
        if field in data:
            allowed_updates[field] = data[field]
    if not allowed_updates:
        return jsonify({'error': 'No fields to update'}), 400
        
    success = database.update_event(event_id, allowed_updates)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Event not found or no changes made'}), 404

# ==========================================================================
# Staff REST APIs
# ==========================================================================
@app.route('/api/staff', methods=['GET'])
def get_staff():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    staff = database.get_all_staff()
    return jsonify(staff)

@app.route('/api/staff', methods=['POST'])
def create_staff():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    name = data.get('name')
    email = data.get('email')
    active = data.get('active', 1)
    if not name:
        return jsonify({'error': 'Staff name is required'}), 400
    new_id = database.add_staff(name, email, int(active))
    return jsonify({'success': True, 'id': new_id}), 201

@app.route('/api/staff/<int:staff_id>', methods=['PUT', 'PATCH'])
def edit_staff(staff_id):
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json or {}
    allowed_updates = {}
    for field in ['name', 'email', 'active']:
        if field in data:
            allowed_updates[field] = data[field]
    if not allowed_updates:
        return jsonify({'error': 'No fields to update'}), 400
    if 'active' in allowed_updates:
        allowed_updates['active'] = int(allowed_updates['active'])
        
    success = database.update_staff(staff_id, allowed_updates)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Staff not found or no changes made'}), 404

# ==========================================================================
# Collector REST APIs
# ==========================================================================
@app.route('/api/collectors', methods=['GET'])
def get_collectors():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
        
    search = request.args.get('search')
    status = request.args.get('status')
    follow_up_status = request.args.get('follow_up_status')
    artwork_id = request.args.get('artwork_id')
    event_id = request.args.get('event_id')
    staff_id = request.args.get('staff_id')
    
    if artwork_id: artwork_id = int(artwork_id)
    if event_id: event_id = int(event_id)
    if staff_id: staff_id = int(staff_id)
    
    collectors = database.get_all_collectors(
        search_query=search,
        status_filter=status,
        follow_up_filter=follow_up_status,
        artwork_filter=artwork_id,
        event_filter=event_id,
        staff_filter=staff_id
    )
    return jsonify(collectors)

@app.route('/api/collectors', methods=['POST'])
def create_collector():
    data = request.json or {}
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    story = data.get('story')
    artwork_interest = data.get('artwork_interest')
    notes = data.get('notes')
    follow_up_date = data.get('follow_up_date')
    follow_up_status = data.get('follow_up_status', 'pending')
    
    artwork_id = data.get('artwork_id')
    event_id = data.get('event_id')
    staff_id = data.get('staff_id')
    interest_level = data.get('interest_level')
    status = data.get('status')
    next_action = data.get('next_action')
    source = data.get('source')
    
    if artwork_id: artwork_id = int(artwork_id)
    if event_id: event_id = int(event_id)
    if staff_id: staff_id = int(staff_id)

    # 1. Validation constraints (Name and Phone required, Email optional)
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    if not phone:
        return jsonify({'error': 'Phone number is required.'}), 400
    if email and ('@' not in email or '.' not in email):
        return jsonify({'error': 'A valid email is required.'}), 400
        
    is_staff = session.get('authorized', False)
    
    if not source:
        source = 'Staff Input' if is_staff else 'QR Visitor'
        
    if source == 'QR Visitor':
        if not interest_level: interest_level = 'Curious'
        if not status: status = 'New'
        
    if source == 'Staff Input':
        if not interest_level: interest_level = 'Interested'
        if not status: status = 'Active'

    # Duplicate check warnings
    force = data.get('force') == True
    if is_staff and not force:
        duplicate = database.check_duplicate_collector(email, phone)
        if duplicate:
            return jsonify({
                'warning': 'duplicate',
                'message': 'A collector with this email or phone number is already registered.',
                'collector': {
                    'id': duplicate['id'],
                    'name': duplicate['name'],
                    'email': duplicate['email'] or 'No Email'
                }
            }), 409

    new_id = database.add_collector(
        name=name,
        email=email,
        phone=phone,
        story=story,
        artwork_interest=artwork_interest,
        notes=notes,
        follow_up_date=follow_up_date,
        follow_up_status=follow_up_status,
        artwork_id=artwork_id,
        event_id=event_id,
        staff_id=staff_id,
        interest_level=interest_level,
        status=status,
        next_action=next_action,
        source=source
    )
    
    return jsonify({'success': True, 'id': new_id}), 201

@app.route('/api/collectors/<int:collector_id>', methods=['PUT', 'PATCH'])
def update_collector(collector_id):
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json or {}
    
    allowed_updates = {}
    fields = [
        'name', 'email', 'phone', 'story', 'artwork_interest', 'notes', 
        'follow_up_date', 'follow_up_status', 'artwork_id', 'event_id', 
        'staff_id', 'interest_level', 'status', 'next_action', 'source'
    ]
    for field in fields:
        if field in data:
            val = data[field]
            if field in ['artwork_id', 'event_id', 'staff_id'] and val:
                val = int(val)
            allowed_updates[field] = val
            
    if not allowed_updates:
        return jsonify({'error': 'No fields to update'}), 400
        
    success = database.update_collector(collector_id, allowed_updates)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Collector not found or no changes made'}), 404

@app.route('/api/collectors/<int:collector_id>', methods=['DELETE'])
def delete_collector(collector_id):
    if ADMIN_PASSWORD and not session.get('authorized'):
        return jsonify({'error': 'Unauthorized'}), 401
        
    success = database.delete_collector(collector_id)
    if success:
        return jsonify({'success': True})
    return jsonify({'error': 'Collector not found'}), 404

@app.route('/api/export', methods=['GET'])
def export_csv():
    if ADMIN_PASSWORD and not session.get('authorized'):
        return make_response(redirect(url_for('admin_page')))
        
    collectors = database.get_all_collectors()
    
    si = io.StringIO()
    cw = csv.writer(si)
    
    # Write header
    cw.writerow(['ID', 'Name', 'Email', 'Phone', 'Personal Story', 'Artwork Interest', 'Follow-up Date', 'Follow-up Status', 'Notes', 'Interest Level', 'Status', 'Next Action', 'Source', 'Event', 'Staff Member', 'Created At', 'Updated At'])
    
    # Write rows
    for c in collectors:
        cw.writerow([
            c['id'],
            c['name'],
            c['email'] or '—',
            c['phone'] or '—',
            c['story'] or '—',
            c['artwork_interest'] or '—',
            c['follow_up_date'] or '—',
            c['follow_up_status'],
            c['notes'] or '—',
            c['interest_level'],
            c['status'],
            c['next_action'] or '—',
            c['source'],
            c['event_name'] or '—',
            c['staff_name'] or '—',
            c['created_at'],
            c['updated_at']
        ])
        
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=finch_future_collectors.csv"
    output.headers["Content-type"] = "text/csv"
    return output

if __name__ == '__main__':
    # Listen on all interfaces so other devices can access via Wi-Fi/local network
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Finch CRM Server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
