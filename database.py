import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'collectors.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Create tables with new schemas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS artworks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            availability TEXT DEFAULT 'Available',
            price REAL,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            start_date TEXT,
            end_date TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS collectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            story TEXT,
            artwork_interest TEXT,
            follow_up_date TEXT,
            follow_up_status TEXT DEFAULT 'pending',
            notes TEXT,
            artwork_id INTEGER,
            event_id INTEGER,
            staff_id INTEGER,
            interest_level TEXT DEFAULT 'Curious',
            status TEXT DEFAULT 'New',
            next_action TEXT,
            source TEXT DEFAULT 'Staff Input',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. Add structural updates dynamically (ALTER TABLE check loops)
    # Collectors
    cursor.execute("PRAGMA table_info(collectors)")
    col_cols = [col[1] for col in cursor.fetchall()]
    if 'updated_at' not in col_cols:
        cursor.execute("ALTER TABLE collectors ADD COLUMN updated_at TIMESTAMP")
        cursor.execute("UPDATE collectors SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
    if 'email' in col_cols:
        pass
        
    # Artworks
    cursor.execute("PRAGMA table_info(artworks)")
    art_cols = [col[1] for col in cursor.fetchall()]
    if 'active' not in art_cols:
        cursor.execute("ALTER TABLE artworks ADD COLUMN active INTEGER DEFAULT 1")
    if 'updated_at' not in art_cols:
        cursor.execute("ALTER TABLE artworks ADD COLUMN updated_at TIMESTAMP")
        cursor.execute("UPDATE artworks SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        
    # Events
    cursor.execute("PRAGMA table_info(events)")
    ev_cols = [col[1] for col in cursor.fetchall()]
    if 'location' not in ev_cols:
        cursor.execute("ALTER TABLE events ADD COLUMN location TEXT")
    if 'start_date' not in ev_cols:
        cursor.execute("ALTER TABLE events ADD COLUMN start_date TEXT")
    if 'end_date' not in ev_cols:
        cursor.execute("ALTER TABLE events ADD COLUMN end_date TEXT")
    if 'active' not in ev_cols:
        cursor.execute("ALTER TABLE events ADD COLUMN active INTEGER DEFAULT 1")
    if 'updated_at' not in ev_cols:
        cursor.execute("ALTER TABLE events ADD COLUMN updated_at TIMESTAMP")
        cursor.execute("UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        
    # Staff
    cursor.execute("PRAGMA table_info(staff)")
    st_cols = [col[1] for col in cursor.fetchall()]
    if 'updated_at' not in st_cols:
        cursor.execute("ALTER TABLE staff ADD COLUMN updated_at TIMESTAMP")
        cursor.execute("UPDATE staff SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
        
    conn.commit()
    
    # 3. Seed default data if empty
    # Artworks
    cursor.execute("SELECT COUNT(*) FROM artworks")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO artworks (title, category, availability, price, active)
            VALUES (?, ?, ?, ?, ?)
        ''', [
            ("Alien Invasion — Haarlem (2025)", "Painting", "Available", 22500.0, 1),
            ("Adopt a Finch Series", "Mixed Media", "Available", 450.0, 1),
            ("The Bleaching Grounds", "Painting", "Available", 18000.0, 1)
        ])
        
    # Events
    cursor.execute("SELECT COUNT(*) FROM events")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO events (name, location, start_date, end_date, active)
            VALUES (?, ?, ?, ?, ?)
        ''', [
            ("Art Rotterdam", "Rotterdam", "2026-02-05", "2026-02-08", 1),
            ("PAN Amsterdam", "Amsterdam", "2026-11-22", "2026-11-29", 1),
            ("Studio Visit", "Joe's Studio", None, None, 1)
        ])
        
    # Staff
    cursor.execute("SELECT COUNT(*) FROM staff")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO staff (name, email, active)
            VALUES (?, ?, ?)
        ''', [
            ("Joe Finch", "joe@joefinch.com", 1),
            ("Bud", "bud@joefinch.com", 1)
        ])
        
    conn.commit()
    conn.close()

# ==========================================================================
# Artwork Queries
# ==========================================================================
def add_artwork(title, category=None, availability='Available', price=None, active=1):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO artworks (title, category, availability, price, active)
        VALUES (?, ?, ?, ?, ?)
    ''', (title, category, availability, price, active))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id

def get_all_artworks():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM artworks ORDER BY title ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_artwork(artwork_id, updates):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    params = []
    for key, val in updates.items():
        if key in ['title', 'category', 'availability', 'price', 'active']:
            fields.append(f'{key} = ?')
            params.append(val)
    if not fields:
        conn.close()
        return False
    fields.append("updated_at = CURRENT_TIMESTAMP")
    params.append(artwork_id)
    cursor.execute(f"UPDATE artworks SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return changes > 0

# ==========================================================================
# Event Queries
# ==========================================================================
def add_event(name, location=None, start_date=None, end_date=None, active=1):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO events (name, location, start_date, end_date, active)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, location, start_date, end_date, active))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id

def get_all_events():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_event(event_id, updates):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    params = []
    for key, val in updates.items():
        if key in ['name', 'location', 'start_date', 'end_date', 'active']:
            fields.append(f'{key} = ?')
            params.append(val)
    if not fields:
        conn.close()
        return False
    fields.append("updated_at = CURRENT_TIMESTAMP")
    params.append(event_id)
    cursor.execute(f"UPDATE events SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return changes > 0

# ==========================================================================
# Staff Queries
# ==========================================================================
def add_staff(name, email=None, active=1):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO staff (name, email, active) VALUES (?, ?, ?)", (name, email, active))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id

def get_all_staff():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM staff ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_staff(staff_id, updates):
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    params = []
    for key, val in updates.items():
        if key in ['name', 'email', 'active']:
            fields.append(f'{key} = ?')
            params.append(val)
    if not fields:
        conn.close()
        return False
    fields.append("updated_at = CURRENT_TIMESTAMP")
    params.append(staff_id)
    cursor.execute(f"UPDATE staff SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return changes > 0

# ==========================================================================
# Collector Queries
# ==========================================================================
def check_duplicate_collector(email, phone):
    if not email and not phone:
        return None
    conn = get_db()
    cursor = conn.cursor()
    row = None
    
    # Check email and phone separately to find any matches
    if email and phone:
        cursor.execute("SELECT * FROM collectors WHERE email = ? OR (phone = ? AND phone IS NOT NULL AND phone != '')", (email, phone))
        row = cursor.fetchone()
    elif email:
        cursor.execute("SELECT * FROM collectors WHERE email = ?", (email,))
        row = cursor.fetchone()
    elif phone:
        cursor.execute("SELECT * FROM collectors WHERE phone = ?", (phone,))
        row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_collector(name, email=None, phone=None, story=None, artwork_interest=None, notes=None, 
                  follow_up_date=None, follow_up_status='pending', artwork_id=None,
                  event_id=None, staff_id=None, interest_level='Curious', status='New',
                  next_action=None, source='Staff Input'):
    conn = get_db()
    cursor = conn.cursor()
    
    # Dynamic text lookup for artwork_interest if missing
    if artwork_id and not artwork_interest:
        cursor.execute("SELECT title FROM artworks WHERE id = ?", (artwork_id,))
        art_row = cursor.fetchone()
        if art_row:
            artwork_interest = art_row['title']
            
    cursor.execute('''
        INSERT INTO collectors (name, email, phone, story, artwork_interest, notes, 
                                follow_up_date, follow_up_status, artwork_id, event_id, 
                                staff_id, interest_level, status, next_action, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, email, phone, story, artwork_interest, notes, 
          follow_up_date, follow_up_status, artwork_id, event_id, 
          staff_id, interest_level, status, next_action, source))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return new_id

def get_all_collectors(search_query=None, status_filter=None, follow_up_filter=None, 
                       artwork_filter=None, event_filter=None, staff_filter=None):
    conn = get_db()
    cursor = conn.cursor()
    
    query = '''
        SELECT c.*, 
               a.title AS artwork_title, 
               e.name AS event_name, 
               s.name AS staff_name
        FROM collectors c
        LEFT JOIN artworks a ON c.artwork_id = a.id
        LEFT JOIN events e ON c.event_id = e.id
        LEFT JOIN staff s ON c.staff_id = s.id
    '''
    
    params = []
    conditions = []
    
    if status_filter:
        conditions.append('c.status = ?')
        params.append(status_filter)
        
    if follow_up_filter:
        conditions.append('c.follow_up_status = ?')
        params.append(follow_up_filter)
        
    if artwork_filter:
        conditions.append('c.artwork_id = ?')
        params.append(artwork_filter)
        
    if event_filter:
        conditions.append('c.event_id = ?')
        params.append(event_filter)
        
    if staff_filter:
        conditions.append('c.staff_id = ?')
        params.append(staff_filter)
        
    if search_query:
        search_cond = '''
            (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.story LIKE ? 
             OR c.notes LIKE ? OR c.next_action LIKE ? OR a.title LIKE ? 
             OR e.name LIKE ? OR s.name LIKE ?)
        '''
        conditions.append(search_cond)
        like_param = f'%{search_query}%'
        params.extend([like_param] * 9)
        
    if conditions:
        query += ' WHERE ' + ' AND '.join(conditions)
        
    query += ' ORDER BY c.created_at DESC'
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_collector_by_id(collector_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT c.*, 
               a.title AS artwork_title, 
               e.name AS event_name, 
               s.name AS staff_name
        FROM collectors c
        LEFT JOIN artworks a ON c.artwork_id = a.id
        LEFT JOIN events e ON c.event_id = e.id
        LEFT JOIN staff s ON c.staff_id = s.id
        WHERE c.id = ?
    ''', (collector_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_collector(collector_id, updates):
    conn = get_db()
    cursor = conn.cursor()
    
    fields = []
    params = []
    allowed_keys = [
        'name', 'email', 'phone', 'story', 'artwork_interest', 'notes', 
        'follow_up_date', 'follow_up_status', 'artwork_id', 'event_id', 
        'staff_id', 'interest_level', 'status', 'next_action', 'source'
    ]
    
    for key, val in updates.items():
        if key in allowed_keys:
            fields.append(f'{key} = ?')
            params.append(val)
            
            # Auto-sync text artwork interest
            if key == 'artwork_id' and val:
                cursor.execute("SELECT title FROM artworks WHERE id = ?", (val,))
                art_row = cursor.fetchone()
                if art_row:
                    fields.append('artwork_interest = ?')
                    params.append(art_row['title'])
            
    if not fields:
        conn.close()
        return False
        
    fields.append("updated_at = CURRENT_TIMESTAMP")
    params.append(collector_id)
    query = f"UPDATE collectors SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, params)
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return changes > 0

def delete_collector(collector_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM collectors WHERE id = ?', (collector_id,))
    conn.commit()
    changes = cursor.rowcount
    conn.close()
    return changes > 0
