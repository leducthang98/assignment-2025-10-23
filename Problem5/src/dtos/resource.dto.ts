export class CreateResourceDto {
  name: string;
  description?: string;
  status?: string;

  constructor(data: unknown) {
    if (!this.isValidData(data)) {
      throw new Error('Invalid resource data');
    }

    this.name = data.name;
    this.description = data.description;
    this.status = data.status || 'active';
  }

  private isValidData(data: unknown): data is { name: string; description?: string; status?: string } {
    return (
      typeof data === 'object' &&
      data !== null &&
      'name' in data &&
      typeof (data as { name: unknown }).name === 'string' &&
      (data as { name: string }).name.trim().length > 0
    );
  }
}

export class UpdateResourceDto {
  name?: string;
  description?: string;
  status?: string;

  constructor(data: unknown) {
    if (!this.isValidData(data)) {
      throw new Error('Invalid update data');
    }

    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
  }

  private isValidData(data: unknown): data is { name?: string; description?: string; status?: string } {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const hasValidFields = Object.keys(data).some(key => 
      ['name', 'description', 'status'].includes(key)
    );

    return hasValidFields;
  }

  isEmpty(): boolean {
    return !this.name && !this.description && !this.status;
  }
}

export class ResourceQueryDto {
  status?: string;
  name?: string;
  page: number;
  limit: number;

  constructor(query: Record<string, unknown>) {
    this.status = query.status ? String(query.status) : undefined;
    this.name = query.name ? String(query.name) : undefined;
    this.page = this.parsePositiveInt(query.page, 1);
    this.limit = this.parsePositiveInt(query.limit, 10);

    if (this.limit > 100) {
      this.limit = 100;
    }
  }

  private parsePositiveInt(value: unknown, defaultValue: number): number {
    const parsed = typeof value === 'string' ? parseInt(value, 10) : defaultValue;
    return parsed > 0 ? parsed : defaultValue;
  }

  get offset(): number {
    return (this.page - 1) * this.limit;
  }
}

