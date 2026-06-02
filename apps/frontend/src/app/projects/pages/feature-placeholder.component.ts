import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-feature-placeholder',
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4 text-gray-800">{{ title }}</h1>
      <p class="text-gray-600">Trang {{ title }} đang phát triển cho Epic tiếp theo.</p>
    </div>
  `,
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] || 'Tính năng';
}
