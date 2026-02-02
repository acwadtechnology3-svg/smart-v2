import { pool, query } from '../config/database';

export abstract class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find record by ID
   */
  async findById(id: string): Promise<T | null> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find all records with optional limit and offset
   */
  async findAll(limit: number = 100, offset: number = 0): Promise<T[]> {
    const result = await query(
      `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Find records by field
   */
  async findBy(field: string, value: any, limit: number = 100): Promise<T[]> {
    const result = await query(
      `SELECT * FROM ${this.tableName} WHERE ${field} = $1 LIMIT $2`,
      [value, limit]
    );
    return result.rows;
  }

  /**
   * Count total records
   */
  async count(): Promise<number> {
    const result = await query(`SELECT COUNT(*) FROM ${this.tableName}`);
    return parseInt(result.rows[0].count);
  }

  /**
   * Insert new record
   */
  async create(data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');

    const result = await query(
      `UPDATE ${this.tableName}
       SET ${setClause}
       WHERE id = $1
       RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  /**
   * Execute raw query
   */
  protected async rawQuery(sql: string, params?: any[]) {
    return await query(sql, params);
  }
}
