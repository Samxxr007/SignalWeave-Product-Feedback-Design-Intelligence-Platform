import psycopg2

conn = psycopg2.connect('postgresql://sw_user:sw_password_2024@localhost:5432/signalweave')
cur = conn.cursor()
cur.execute("SELECT tablename, schemaname FROM pg_tables WHERE schemaname='public' ORDER BY tablename;")
tables = cur.fetchall()

print("=== POSTGRESQL PUBLIC TABLES & ROW COUNTS ===")
for t_name, s_name in tables:
    cur.execute(f'SELECT count(*) FROM "{t_name}"')
    cnt = cur.fetchone()[0]
    print(f"- {t_name} ({s_name}): {cnt} records")

cur.close()
conn.close()
