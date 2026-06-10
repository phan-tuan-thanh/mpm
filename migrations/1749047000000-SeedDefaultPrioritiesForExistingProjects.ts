import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_PRIORITIES = [
  { name: 'Urgent', value: 'urgent', color_light: '#EF4444', color_dark: '#FCA5A5', icon: 'pi pi-flag', order: 1, is_system: false },
  { name: 'High',   value: 'high',   color_light: '#F97316', color_dark: '#FDBA74', icon: 'pi pi-flag', order: 2, is_system: false },
  { name: 'Medium', value: 'medium', color_light: '#EAB308', color_dark: '#FDE047', icon: 'pi pi-flag', order: 3, is_system: false },
  { name: 'Low',    value: 'low',    color_light: '#3B82F6', color_dark: '#93C5FD', icon: 'pi pi-flag', order: 4, is_system: false },
  { name: 'None',   value: 'none',   color_light: '#9CA3AF', color_dark: '#6B7280', icon: 'pi pi-flag', order: 5, is_system: true  },
];

export class SeedDefaultPrioritiesForExistingProjects1749047000000 implements MigrationInterface {
  name = 'SeedDefaultPrioritiesForExistingProjects1749047000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const projects: { id: string }[] = await queryRunner.query(`SELECT id FROM projects`);
    for (const project of projects) {
      for (const p of DEFAULT_PRIORITIES) {
        await queryRunner.query(
          `INSERT INTO project_priority (project_id, name, value, color_light, color_dark, icon, "order", is_system)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (project_id, value) DO NOTHING`,
          [project.id, p.name, p.value, p.color_light, p.color_dark, p.icon, p.order, p.is_system],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM project_priority WHERE value IN ('urgent', 'high', 'medium', 'low', 'none')`,
    );
  }
}
