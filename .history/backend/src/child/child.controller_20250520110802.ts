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
  import { ChildService } from './child.service';
  import { CreateChildDto } from './dto/create-child.dto';
  import { UpdateChildDto } from './dto/update-child.dto';
  
  @Controller('children')
  export class ChildController {
    constructor(private readonly childService: ChildService) {}
  
    @Post()
    create(@Body() createChildDto: CreateChildDto) {
      return this.childService.create(createChildDto);
    }
  
    @Get()
    findAll() {
      return this.childService.findAll();
    }
  
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
      return this.childService.findOne(id);
    }
  
    @Patch(':id')
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() updateChildDto: UpdateChildDto,
    ) {
      return this.childService.update(id, updateChildDto);
    }
  
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
      return this.childService.remove(id);
    }
  }
  