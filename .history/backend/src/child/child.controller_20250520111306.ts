import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
  } from '@nestjs/common';
  import { plainToInstance } from 'class-transformer';
  import { ChildService } from './child.service';
  import { CreateChildDto } from './dto/create-child.dto';
  import { UpdateChildDto } from './dto/update-child.dto
  import { ChildResponseDto } from './dto/child-response.dto';
  
  @Controller('children')
  export class ChildController {
    constructor(private readonly childService: ChildService) {}
  
    @Post()
    async create(
      @Body() createChildDto: CreateChildDto,
    ): Promise<ChildResponseDto> {
      const child = await this.childService.create(createChildDto);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
        parentProfileId: child.parentProfileId,
      });
    }
  
    @Get()
    async findAll(): Promise<ChildResponseDto[]> {
      const children = await this.childService.findAll();
      return children.map(child =>
        plainToInstance(ChildResponseDto, {
          ...child,
          birthDate: child.birthDate.toISOString(),
          parentProfileId: child.parentProfileId,
        }),
      );
    }
  
    @Get(':id')
    async findOne(
      @Param('id', ParseIntPipe) id: number,
    ): Promise<ChildResponseDto> {
      const child = await this.childService.findOne(id);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
        parentProfileId: child.parentProfileId,
      });
    }
  
    @Patch(':id')
    async update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateChildDto: UpdateChildDto,
    ): Promise<ChildResponseDto> {
      const child = await this.childService.update(id, updateChildDto);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
        parentProfileId: child.parentProfileId,
      });
    }
  
    @Delete(':id')
    async remove(
      @Param('id', ParseIntPipe) id: number,
    ): Promise<ChildResponseDto> {
      const child = await this.childService.remove(id);
      return plainToInstance(ChildResponseDto, {
        ...child,
        birthDate: child.birthDate.toISOString(),
        parentProfileId: child.parentProfileId,
      });
    }
  }
  