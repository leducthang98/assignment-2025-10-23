import { db } from '../database/db';
import { Resource } from '../types';

interface CountRow {
  count: number;
}

interface RunResult {
  lastID: number;
  changes: number;
}

export class ResourceModel {
  static create(resource: { name: string; description?: string; status?: string }): Promise<Resource> {
    return new Promise((resolve, reject) => {
      const { name, description, status } = resource;
      db.run(
        `INSERT INTO resources (name, description, status) VALUES (?, ?, ?)`,
        [name, description || null, status || 'active'],
        function (this: RunResult, err: Error | null) {
          if (err) {
            reject(err);
          } else {
            ResourceModel.findById(this.lastID)
              .then((result) => {
                if (result) resolve(result);
                else reject(new Error('Failed to retrieve created resource'));
              })
              .catch(reject);
          }
        }
      );
    });
  }

  static findAll(
    filters: { status?: string; name?: string },
    limit: number,
    offset: number
  ): Promise<{ data: Resource[]; total: number }> {
    return new Promise((resolve, reject) => {
      const { status, name } = filters;
      let query = 'SELECT * FROM resources WHERE 1=1';
      const params: (string | number)[] = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      if (name) {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
      }

      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      
      db.get(countQuery, params, (err: Error | null, row: CountRow) => {
        if (err) {
          reject(err);
          return;
        }

        const total = row.count;
        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const finalParams = [...params, limit, offset];

        db.all(query, finalParams, (err: Error | null, rows: Resource[]) => {
          if (err) reject(err);
          else resolve({ data: rows, total });
        });
      });
    });
  }

  static findById(id: number): Promise<Resource | null> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM resources WHERE id = ?', [id], (err: Error | null, row?: Resource) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  static update(id: number, resource: Partial<Resource>): Promise<Resource | null> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: (string | number | null)[] = [];

      if (resource.name !== undefined) {
        fields.push('name = ?');
        values.push(resource.name);
      }
      if (resource.description !== undefined) {
        fields.push('description = ?');
        values.push(resource.description || null);
      }
      if (resource.status !== undefined) {
        fields.push('status = ?');
        values.push(resource.status);
      }

      if (fields.length === 0) {
        resolve(null);
        return;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE resources SET ${fields.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function (this: RunResult, err: Error | null) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          resolve(null);
        } else {
          ResourceModel.findById(id).then(resolve).catch(reject);
        }
      });
    });
  }

  static delete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM resources WHERE id = ?', [id], function (this: RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }
}

