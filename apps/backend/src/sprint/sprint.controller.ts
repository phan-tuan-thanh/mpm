import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { ProjectRoles } from '../auth/decorators/project-roles.decorator';
import { SprintService } from './sprint.service';
import { SnapshotService } from './snapshot.service';
import { VelocityService } from './velocity.service';
import { CapacityService } from './capacity.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { CompleteSprintDto } from './dto/complete-sprint.dto';
import { BulkDeleteSprintDto } from './dto/bulk-delete-sprint.dto';
import { UpdateMemberCapacityDto } from './dto/update-member-capacity.dto';
import { AssignTasksDto, BulkRemoveTasksDto } from './dto/assign-tasks.dto';
import { UpdateSprintSettingsDto } from './dto/update-sprint-settings.dto';
import { SprintQueryDto } from './dto/sprint-query.dto';

@Controller('api/projects/:projectId/sprints')
export class SprintController {
  constructor(
    private readonly sprintService: SprintService,
    private readonly snapshotService: SnapshotService,
    private readonly velocityService: VelocityService,
    private readonly capacityService: CapacityService,
  ) {}

  // ─── Sprint CRUD ──────────────────────────────────────────────────────────────

  @Get()
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: SprintQueryDto,
  ) {
    return this.sprintService.findAll(projectId, query);
  }

  @Post()
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateSprintDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.sprintService.create(projectId, dto, user.id);
  }

  @Delete('bulk')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkDelete(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: BulkDeleteSprintDto,
  ) {
    return this.sprintService.bulkDelete(projectId, dto);
  }

  // ─── Dashboard & Velocity ─────────────────────────────────────────────────────
  // IMPORTANT: static routes must come BEFORE :sprintId to avoid NestJS route conflict

  @Get('dashboard')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  getDashboard(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.velocityService.getDashboard(projectId);
  }

  @Get('velocity')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  getVelocity(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.velocityService.getVelocity(projectId);
  }

  // ─── Settings ─────────────────────────────────────────────────────────────────

  @Get('settings')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  getSettings(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.sprintService.getSettings(projectId);
  }

  @Patch('settings')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  updateSettings(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpdateSprintSettingsDto,
  ) {
    return this.sprintService.updateSettings(projectId, dto);
  }

  // ─── Dynamic :sprintId routes (must come AFTER all static routes) ─────────────

  @Get(':sprintId')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ) {
    return this.sprintService.findOne(projectId, sprintId);
  }

  @Patch(':sprintId')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return this.sprintService.update(projectId, sprintId, dto);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────────

  @Post(':sprintId/start')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  startSprint(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ) {
    return this.sprintService.startSprint(projectId, sprintId);
  }

  @Post(':sprintId/complete')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  completeSprint(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: CompleteSprintDto,
  ) {
    return this.sprintService.completeSprint(projectId, sprintId, dto);
  }

  // ─── Burndown ─────────────────────────────────────────────────────────────────

  @Get(':sprintId/burndown')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  async getBurndown(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ) {
    const sprint = await this.sprintService.findOne(projectId, sprintId);
    return this.snapshotService.buildBurndown(sprint, sprint.snapshots ?? []);
  }

  // ─── Member capacity ──────────────────────────────────────────────────────────

  @Get(':sprintId/capacities')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA', 'Stakeholder')
  getMemberCapacities(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ) {
    return this.sprintService.getMemberCapacities(projectId, sprintId);
  }

  @Put(':sprintId/capacities')
  @ProjectRoles('Scrum_Master', 'Product_Owner')
  upsertMemberCapacity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: UpdateMemberCapacityDto,
  ) {
    return this.sprintService.upsertMemberCapacity(projectId, sprintId, dto);
  }

  // ─── Task assignment ──────────────────────────────────────────────────────────

  @Post(':sprintId/tasks')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  addTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: AssignTasksDto,
  ) {
    return this.sprintService.addTasks(projectId, sprintId, dto);
  }

  @Delete(':sprintId/tasks')
  @ProjectRoles('Scrum_Master', 'Product_Owner', 'Developer', 'QA')
  @HttpCode(HttpStatus.NO_CONTENT)
  bulkRemoveTasks(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: BulkRemoveTasksDto,
  ) {
    return this.sprintService.bulkRemoveTasks(projectId, sprintId, dto);
  }
}
