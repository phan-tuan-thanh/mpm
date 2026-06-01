import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-backlog-placeholder',
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4 text-gray-800">Backlog View (Epic B)</h1>
      <p class="text-gray-600">Trang Backlog đang phát triển cho Epic tiếp theo.</p>
    </div>
  `,
})
export class BacklogPlaceholderComponent {}
