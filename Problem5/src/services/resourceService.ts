import { ResourceModel } from '../models/resource';
import { Resource } from '../types';
import { CreateResourceDto, UpdateResourceDto, ResourceQueryDto } from '../dtos/resource.dto';
import { NotFoundError, ValidationError } from '../errors/appError';

export class ResourceService {
  async createResource(dto: CreateResourceDto): Promise<Resource> {
    try {
      return await ResourceModel.create(dto);
    } catch (error) {
      throw new ValidationError('Failed to create resource');
    }
  }

  async getResources(query: ResourceQueryDto): Promise<{ data: Resource[]; total: number; page: number; pages: number }> {
    const filters = {
      status: query.status,
      name: query.name,
    };

    const result = await ResourceModel.findAll(filters, query.limit, query.offset);

    return {
      data: result.data,
      total: result.total,
      page: query.page,
      pages: Math.ceil(result.total / query.limit),
    };
  }

  async getResourceById(id: number): Promise<Resource> {
    const resource = await ResourceModel.findById(id);
    
    if (!resource) {
      throw new NotFoundError('Resource');
    }

    return resource;
  }

  async updateResource(id: number, dto: UpdateResourceDto): Promise<Resource> {
    if (dto.isEmpty()) {
      throw new ValidationError('No fields to update');
    }

    const resource = await ResourceModel.update(id, dto);
    
    if (!resource) {
      throw new NotFoundError('Resource');
    }

    return resource;
  }

  async deleteResource(id: number): Promise<void> {
    const deleted = await ResourceModel.delete(id);
    
    if (!deleted) {
      throw new NotFoundError('Resource');
    }
  }
}

