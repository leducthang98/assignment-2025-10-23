import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../services/resourceService';
import { CreateResourceDto, UpdateResourceDto, ResourceQueryDto } from '../dtos/resource.dto';

const resourceService = new ResourceService();

export const createResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = new CreateResourceDto(req.body);
    const resource = await resourceService.createResource(dto);
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

export const getResources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = new ResourceQueryDto(req.query);
    const result = await resourceService.getResources(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const resource = await resourceService.getResourceById(id);
    res.json(resource);
  } catch (error) {
    next(error);
  }
};

export const updateResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const dto = new UpdateResourceDto(req.body);
    const resource = await resourceService.updateResource(id, dto);
    res.json(resource);
  } catch (error) {
    next(error);
  }
};

export const deleteResource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    await resourceService.deleteResource(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

