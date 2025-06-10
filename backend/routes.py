from flask import Flask, jsonify, request, session
from flask_cors import CORS
from datetime import datetime, timedelta
import json
from db import get_db_connection, init_db

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['SECRET_KEY'] = 'your-secret-key-here'  # Change this in production!

# Initialize database on startup
init_db()

# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Admin login endpoint"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Simple demo authentication (replace with proper user management)
    if username == 'admin' and password == 'admin':
        session['user_id'] = 1
        session['is_admin'] = True
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {'id': 1, 'username': 'admin', 'role': 'admin'}
        })
    
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Admin logout endpoint"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user': {'id': session['user_id'], 'is_admin': session.get('is_admin', False)}
        })
    return jsonify({'authenticated': False})

# ============================================================================
# MATCH MANAGEMENT ROUTES
# ============================================================================

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Get all matches with optional filtering and sorting"""
    status = request.args.get('status')  # live, completed, scheduled
    court = request.args.get('court')
    date = request.args.get('date')
    event_type = request.args.get('event_type')
    search = request.args.get('search', '').lower()
    sort_by = request.args.get('sort_by', 'end_time')  # end_time, scheduled_date
    sort_order = request.args.get('sort_order', 'desc')  # asc, desc
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Base query
        query = '''
        SELECT m.* FROM match m
        WHERE 1=1
        '''
        params = []
        
        # Apply filters
        if status:
            query += ' AND m.status = ?'
            params.append(status)
        
        # Court filter
        if court and court != 'all':
            query += ' AND m.court = ?'
            params.append(court)
        
        # Date filter
        if date:
            query += ' AND m.date = ?'
            params.append(date)
        
        # Event type filter
        if event_type and event_type != 'all':
            query += ' AND m.event_type = ?'
            params.append(event_type)
        
        # Search filter
        if search:
            query += ''' AND (
                LOWER(m.player1) LIKE ? OR 
                LOWER(m.player2) LIKE ? OR 
                LOWER(m.match_number) LIKE ?
            )'''
            search_param = f'%{search}%'
            params.extend([search_param, search_param, search_param])
        
        # Apply sorting
        sort_column = {
            'end_time': 'm.end_time',
            'scheduled_date': 'm.date'
        }.get(sort_by, 'm.end_time')
        
        sort_direction = 'DESC' if sort_order == 'desc' else 'ASC'
        
        # If sorting by end_time, add date as secondary sort
        if sort_by == 'end_time':
            query += f' ORDER BY {sort_column} {sort_direction}, m.date {sort_direction}'
        else:
            query += f' ORDER BY {sort_column} {sort_direction}'
        
        # Debug logging
        print(f"Executing query: {query}")
        print(f"With params: {params}")
        
        cursor.execute(query, params)
        matches = []
        
        for row in cursor.fetchall():
            match = dict(row)
            # Get scores for this match
            cursor.execute('''
            SELECT set_number, player1_score, player2_score, completed
            FROM score WHERE match_id = ? ORDER BY set_number
            ''', (match['id'],))
            
            scores = []
            for score_row in cursor.fetchall():
                score = dict(score_row)
                scores.append({
                    'set_number': score['set_number'],
                    'player1_score': score['player1_score'],
                    'player2_score': score['player2_score'],
                    'completed': bool(score['completed'])
                })
            
            match['scores'] = scores
            matches.append(match)
        
        # Debug logging
        print(f"Found {len(matches)} matches")
        
        return jsonify(matches)

@app.route('/api/matches', methods=['POST'])
def create_match():
    """Create a new match"""
    data = request.json
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
            INSERT INTO match (
                event_type, match_number, date, time, court, umpire, service_judge,
                max_points, total_sets, deuce_enabled, player1, player2, status,
                shuttles_used
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0)
            ''', (
                data['event_type'], data['match_number'], data['date'], data['time'],
                data['court'], data.get('umpire'), data.get('service_judge'),
                data.get('max_points', 21), data.get('total_sets', 3), 
                data.get('deuce_enabled', True),
                data['player1'], data['player2']
            ))
            
            match_id = cursor.lastrowid
            
            # Initialize scores for each set
            for i in range(1, data.get('total_sets', 3) + 1):
                cursor.execute('''
                INSERT INTO score (match_id, set_number, player1_score, player2_score, completed)
                VALUES (?, ?, 0, 0, 0)
                ''', (match_id, i))
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'match_id': match_id,
                'message': 'Match created successfully'
            })
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error creating match: {str(e)}'
            }), 400

@app.route('/api/matches/<int:match_id>', methods=['GET'])
def get_match(match_id):
    """Get specific match details"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get match details
        cursor.execute('SELECT * FROM match WHERE id = ?', (match_id,))
        match = cursor.fetchone()
        
        if not match:
            return jsonify({'error': 'Match not found'}), 404
        
        match_data = dict(match)
        
        # Get scores
        cursor.execute('''
        SELECT set_number, player1_score, player2_score, completed, updated_at
        FROM score WHERE match_id = ? ORDER BY set_number
        ''', (match_id,))
        
        scores = [dict(row) for row in cursor.fetchall()]
        match_data['scores'] = scores
        
        return jsonify(match_data)

@app.route('/api/matches/<int:match_id>', methods=['PUT'])
def update_match(match_id):
    """Update match details"""
    data = request.json
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Build dynamic update query
            update_fields = []
            params = []
            
            for field in ['event_type', 'match_number', 'date', 'time', 'court', 
                        'umpire', 'service_judge', 'max_points', 'total_sets', 
                        'deuce_enabled', 'player1', 'player2', 'status', 
                        'start_time', 'end_time', 'duration', 'shuttles_used']:
                if field in data:
                    update_fields.append(f'{field} = ?')
                    params.append(data[field])
            
            if update_fields:
                params.append(match_id)
                query = f'UPDATE match SET {", ".join(update_fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
                cursor.execute(query, params)
                conn.commit()
            
            return jsonify({'success': True, 'message': 'Match updated successfully'})
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error updating match: {str(e)}'
            }), 400

@app.route('/api/matches/<int:match_id>', methods=['DELETE'])
def delete_match(match_id):
    """Delete a match"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Delete scores first (foreign key constraint)
            cursor.execute('DELETE FROM score WHERE match_id = ?', (match_id,))
            # Delete match
            cursor.execute('DELETE FROM match WHERE id = ?', (match_id,))
            
            conn.commit()
            return jsonify({'success': True, 'message': 'Match deleted successfully'})
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error deleting match: {str(e)}'
            }), 400

# ============================================================================
# SCORING ROUTES
# ============================================================================

@app.route('/api/matches/<int:match_id>/start', methods=['POST'])
def start_match(match_id):
    """Start a match"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            start_time = datetime.now().isoformat()
            cursor.execute('''
            UPDATE match SET status = 'live', start_time = ?, current_set = 1,
            updated_at = CURRENT_TIMESTAMP WHERE id = ?
            ''', (start_time, match_id))
            
            conn.commit()
            return jsonify({'success': True, 'start_time': start_time})
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error starting match: {str(e)}'
            }), 400

@app.route('/api/matches/<int:match_id>/end', methods=['POST'])
def end_match(match_id):
    """End a match"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Get start time to calculate duration
            cursor.execute('SELECT start_time FROM match WHERE id = ?', (match_id,))
            result = cursor.fetchone()
            
            end_time = datetime.now()
            duration = None
            
            if result and result[0]:
                start_time = datetime.fromisoformat(result[0])
                duration_delta = end_time - start_time
                hours, remainder = divmod(duration_delta.total_seconds(), 3600)
                minutes, _ = divmod(remainder, 60)
                duration = f"{int(hours)}h {int(minutes)}m"
            
            # Get current set scores
            cursor.execute('''
            SELECT current_set, player1_score, player2_score
            FROM match m
            JOIN score s ON m.id = s.match_id AND m.current_set = s.set_number
            WHERE m.id = ?
            ''', (match_id,))
            
            current_set_data = cursor.fetchone()
            if current_set_data:
                current_set, p1_score, p2_score = current_set_data
                
                # Mark current set as completed
                cursor.execute('''
                UPDATE score 
                SET completed = 1,
                    player1_score = ?,
                    player2_score = ?
                WHERE match_id = ? AND set_number = ?
                ''', (p1_score, p2_score, match_id, current_set))
            
            # Update match status
            cursor.execute('''
            UPDATE match SET status = 'completed', end_time = ?, duration = ?,
            updated_at = CURRENT_TIMESTAMP WHERE id = ?
            ''', (end_time.isoformat(), duration, match_id))
            
            conn.commit()
            return jsonify({
                'success': True,
                'end_time': end_time.isoformat(),
                'duration': duration
            })
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error ending match: {str(e)}'
            }), 400

@app.route('/api/matches/<int:match_id>/score', methods=['PUT'])
def update_score(match_id):
    """Update match score"""
    data = request.json
    set_number = data['set_number']
    player = data['player']  # 1 or 2
    action = data['action']  # 'increment' or 'decrement'
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Get current score
            cursor.execute('''
            SELECT player1_score, player2_score, completed FROM score
            WHERE match_id = ? AND set_number = ?
            ''', (match_id, set_number))
            
            result = cursor.fetchone()
            if not result:
                return jsonify({'error': 'Score record not found'}), 404
            
            p1_score, p2_score, completed = result
            
            if completed:
                return jsonify({'error': 'Set is already completed'}), 400
            
            # Update score
            if player == 1:
                if action == 'increment':
                    p1_score += 1
                elif action == 'decrement':
                    p1_score = max(0, p1_score - 1)
            else:
                if action == 'increment':
                    p2_score += 1
                elif action == 'decrement':
                    p2_score = max(0, p2_score - 1)
            
            # Get match settings for completion check
            cursor.execute('SELECT max_points, deuce_enabled FROM match WHERE id = ?', (match_id,))
            max_points, deuce_enabled = cursor.fetchone()
            
            # Check if set is completed
            set_completed = False
            if deuce_enabled:
                # Deuce logic: need 2-point lead and at least max_points
                if (p1_score >= max_points and p1_score - p2_score >= 2) or \
                   (p2_score >= max_points and p2_score - p1_score >= 2):
                    set_completed = True
            else:
                # No deuce: first to max_points wins
                if p1_score >= max_points or p2_score >= max_points:
                    set_completed = True
            
            # Update score in database
            cursor.execute('''
            UPDATE score SET player1_score = ?, player2_score = ?, completed = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE match_id = ? AND set_number = ?
            ''', (p1_score, p2_score, set_completed, match_id, set_number))
            
            conn.commit()
            return jsonify({
                'success': True,
                'player1_score': p1_score,
                'player2_score': p2_score,
                'completed': set_completed
            })
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error updating score: {str(e)}'
            }), 400

@app.route('/api/matches/<int:match_id>/next-set', methods=['POST'])
def next_set(match_id):
    """Move to next set"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT current_set, total_sets FROM match WHERE id = ?', (match_id,))
            current_set, total_sets = cursor.fetchone()
            
            if current_set < total_sets:
                cursor.execute('''
                UPDATE match SET current_set = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                ''', (current_set + 1, match_id))
                conn.commit()
                return jsonify({'success': True, 'current_set': current_set + 1})
            
            return jsonify({'error': 'Already at final set'}), 400
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error moving to next set: {str(e)}'
            }), 400

# ============================================================================
# PLAYER MANAGEMENT ROUTES
# ============================================================================

@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all players"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM player ORDER BY name')
        players = [dict(row) for row in cursor.fetchall()]
        return jsonify(players)

@app.route('/api/players', methods=['POST'])
def create_player():
    """Create a new player"""
    data = request.json
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
            INSERT INTO player (name, team, email, phone)
            VALUES (?, ?, ?, ?)
            ''', (data['name'], data.get('team'), data.get('email'), data.get('phone')))
            
            player_id = cursor.lastrowid
            conn.commit()
            
            return jsonify({
                'success': True,
                'player_id': player_id,
                'message': 'Player created successfully'
            })
        except sqlite3.IntegrityError:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 400
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error creating player: {str(e)}'
            }), 400

@app.route('/api/players/<int:player_id>', methods=['PUT'])
def update_player(player_id):
    """Update player details"""
    data = request.json
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
            UPDATE player SET name = ?, team = ?, email = ?, phone = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            ''', (data['name'], data.get('team'), data.get('email'), 
                  data.get('phone'), player_id))
            
            conn.commit()
            return jsonify({'success': True, 'message': 'Player updated successfully'})
        except sqlite3.IntegrityError:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 400
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error updating player: {str(e)}'
            }), 400

@app.route('/api/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    """Delete a player"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            cursor.execute('DELETE FROM player WHERE id = ?', (player_id,))
            conn.commit()
            return jsonify({'success': True, 'message': 'Player deleted successfully'})
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error deleting player: {str(e)}'
            }), 400

# ============================================================================
# STATISTICS AND ANALYTICS ROUTES
# ============================================================================

@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Live matches count
        cursor.execute("SELECT COUNT(*) FROM match WHERE status = 'live'")
        live_matches = cursor.fetchone()[0]
        
        # Completed matches today
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute("SELECT COUNT(*) FROM match WHERE status = 'completed' AND date = ?", (today,))
        completed_today = cursor.fetchone()[0]
        
        # Active courts
        cursor.execute("SELECT COUNT(DISTINCT court) FROM match WHERE status = 'live'")
        active_courts = cursor.fetchone()[0]
        
        # Average match duration
        cursor.execute("""
        SELECT AVG(
            CASE 
                WHEN duration IS NOT NULL AND duration != '' 
                THEN CAST(SUBSTR(duration, 1, INSTR(duration, 'h')-1) AS INTEGER) * 60 + 
                     CAST(SUBSTR(duration, INSTR(duration, 'h')+2, INSTR(duration, 'm')-INSTR(duration, 'h')-2) AS INTEGER)
                ELSE NULL 
            END
        ) FROM match WHERE status = 'completed' AND duration IS NOT NULL
        """)
        avg_duration_minutes = cursor.fetchone()[0]
        avg_duration = f"{int(avg_duration_minutes)}m" if avg_duration_minutes else "N/A"
        
        return jsonify({
            'live_matches': live_matches,
            'completed_today': completed_today,
            'active_courts': active_courts,
            'avg_duration': avg_duration
        })

@app.route('/api/stats/matches', methods=['GET'])
def get_match_stats():
    """Get detailed match statistics"""
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM match WHERE status = 'completed'"
        params = []
        
        if date_from:
            query += " AND date >= ?"
            params.append(date_from)
        if date_to:
            query += " AND date <= ?"
            params.append(date_to)
        
        cursor.execute(query, params)
        matches = cursor.fetchall()
        
        # Calculate statistics
        total_matches = len(matches)
        total_shuttles = sum(match['shuttles_used'] or 0 for match in matches)
        
        # Event type distribution
        cursor.execute(f"""
        SELECT event_type, COUNT(*) as count 
        FROM match WHERE status = 'completed'
        {' AND date >= ?' if date_from else ''}
        {' AND date <= ?' if date_to else ''}
        GROUP BY event_type
        """, params)
        
        event_distribution = dict(cursor.fetchall())
        
        return jsonify({
            'total_matches': total_matches,
            'total_shuttles': total_shuttles,
            'event_distribution': event_distribution,
            'avg_shuttles_per_match': total_shuttles / total_matches if total_matches > 0 else 0
        })

# ============================================================================
# SYSTEM SETTINGS ROUTES
# ============================================================================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get system settings"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM settings')
        settings = {}
        for row in cursor.fetchall():
            settings[row['key']] = row['value']
        return jsonify(settings)

@app.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update system settings"""
    data = request.json
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            for key, value in data.items():
                cursor.execute('''
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ''', (key, str(value)))
            
            conn.commit()
            return jsonify({'success': True, 'message': 'Settings updated successfully'})
        except Exception as e:
            conn.rollback()
            return jsonify({
                'success': False,
                'message': f'Error updating settings: {str(e)}'
            }), 400

# ============================================================================
# EXPORT ROUTES
# ============================================================================

@app.route('/api/matches/<int:match_id>/export', methods=['GET'])
def export_match(match_id):
    """Export match scoresheet (returns JSON data for PDF generation)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Get complete match data
        cursor.execute('SELECT * FROM match WHERE id = ?', (match_id,))
        match = cursor.fetchone()
        
        if not match:
            return jsonify({'error': 'Match not found'}), 404
        
        match_data = dict(match)
        
        cursor.execute('''
        SELECT set_number, player1_score, player2_score, completed
        FROM score WHERE match_id = ? ORDER BY set_number
        ''', (match_id,))
        
        scores = [dict(row) for row in cursor.fetchall()]
        match_data['scores'] = scores
        
        return jsonify({
            'match_data': match_data,
            'generated_at': datetime.now().isoformat(),
            'export_type': 'scoresheet'
        })

if __name__ == '__main__':
    app.run(debug=True, port=5328, host='0.0.0.0')