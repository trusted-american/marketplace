## A3 Usage Patterns

### Pattern 1: Sidebar Collapse State

The most common usage in A3 — persisting sidebar collapsed/expanded state:

```gts
import Component from '@glimmer/component';
import { localStorage } from 'ember-local-storage-decorator';
import { action } from '@ember/object';
import { on } from '@ember/modifier';

export default class AppSidebar extends Component {
  @localStorage('sidebar-collapsed')
  isCollapsed: boolean = false;

  @action
  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  <template>
    <aside class={{if this.isCollapsed "sidebar sidebar--collapsed" "sidebar sidebar--expanded"}}>
      <button
        class="sidebar-toggle"
        {{on "click" this.toggleSidebar}}
        aria-label={{if this.isCollapsed "Expand sidebar" "Collapse sidebar"}}
      >
        {{if this.isCollapsed ">" "<"}}
      </button>

      {{#unless this.isCollapsed}}
        <nav class="sidebar-nav">
          {{yield}}
        </nav>
      {{/unless}}
    </aside>
  </template>
}
```

### Pattern 2: Table Column Preferences

Allowing users to show/hide columns and persisting their choice:

```gts
import Component from '@glimmer/component';
import { localStorage } from 'ember-local-storage-decorator';
import { action } from '@ember/object';

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export default class EmployeeTable extends Component {
  @localStorage('employee-table-columns')
  savedColumns: string[] = ['name', 'email', 'department', 'status', 'hireDate'];

  @localStorage('employee-table-sort')
  sortConfig: { column: string; direction: 'asc' | 'desc' } = {
    column: 'name',
    direction: 'asc',
  };

  @localStorage('employee-table-page-size')
  pageSize: number = 25;

  get allColumns(): ColumnConfig[] {
    return [
      { key: 'name', label: 'Name', visible: this.savedColumns.includes('name') },
      { key: 'email', label: 'Email', visible: this.savedColumns.includes('email') },
      { key: 'department', label: 'Department', visible: this.savedColumns.includes('department') },
      { key: 'status', label: 'Status', visible: this.savedColumns.includes('status') },
      { key: 'hireDate', label: 'Hire Date', visible: this.savedColumns.includes('hireDate') },
      { key: 'phone', label: 'Phone', visible: this.savedColumns.includes('phone') },
      { key: 'location', label: 'Location', visible: this.savedColumns.includes('location') },
      { key: 'manager', label: 'Manager', visible: this.savedColumns.includes('manager') },
    ];
  }

  get visibleColumns(): ColumnConfig[] {
    return this.allColumns.filter((col) => col.visible);
  }

  @action
  toggleColumn(columnKey: string) {
    const columns = [...this.savedColumns];
    const index = columns.indexOf(columnKey);
    if (index > -1) {
      columns.splice(index, 1);
    } else {
      columns.push(columnKey);
    }
    this.savedColumns = columns; // Triggers localStorage write + re-render
  }

  @action
  updateSort(column: string) {
    if (this.sortConfig.column === column) {
      this.sortConfig = {
        column,
        direction: this.sortConfig.direction === 'asc' ? 'desc' : 'asc',
      };
    } else {
      this.sortConfig = { column, direction: 'asc' };
    }
  }

  @action
  updatePageSize(size: number) {
    this.pageSize = size;
  }
}
```

### Pattern 3: User UI Preferences

Collecting various user preferences in a single component or service:

```ts
// app/services/ui-preferences.ts
import Service from '@ember/service';
import { localStorage } from 'ember-local-storage-decorator';

export default class UiPreferencesService extends Service {
  @localStorage('pref-sidebar-collapsed')
  sidebarCollapsed: boolean = false;

  @localStorage('pref-dark-mode')
  darkMode: boolean = false;

  @localStorage('pref-compact-view')
  compactView: boolean = false;

  @localStorage('pref-items-per-page')
  itemsPerPage: number = 25;

  @localStorage('pref-date-format')
  dateFormat: string = 'MMM D, YYYY';

  @localStorage('pref-start-page')
  startPage: string = 'dashboard';

  @localStorage('pref-recent-employees')
  recentEmployeeIds: string[] = [];

  @localStorage('pref-favorite-reports')
  favoriteReports: string[] = [];

  addRecentEmployee(id: string) {
    const recent = [id, ...this.recentEmployeeIds.filter((eid) => eid !== id)].slice(0, 10);
    this.recentEmployeeIds = recent;
  }

  toggleFavoriteReport(reportId: string) {
    const favorites = [...this.favoriteReports];
    const index = favorites.indexOf(reportId);
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(reportId);
    }
    this.favoriteReports = favorites;
  }
}
```

### Pattern 4: Filter Panel State

Persisting whether filter panels are expanded and what filters were last used:

```gts
import Component from '@glimmer/component';
import { localStorage } from 'ember-local-storage-decorator';
import { action } from '@ember/object';

export default class EmployeeFilters extends Component {
  @localStorage('employee-filters-expanded')
  isExpanded: boolean = true;

  @localStorage('employee-filters-department')
  selectedDepartment: string = '';

  @localStorage('employee-filters-status')
  selectedStatus: string = 'active';

  @localStorage('employee-filters-location')
  selectedLocation: string = '';

  @action
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }

  @action
  updateDepartment(dept: string) {
    this.selectedDepartment = dept;
    this.args.onFilterChange?.(this.currentFilters);
  }

  @action
  updateStatus(status: string) {
    this.selectedStatus = status;
    this.args.onFilterChange?.(this.currentFilters);
  }

  @action
  clearFilters() {
    this.selectedDepartment = '';
    this.selectedStatus = 'active';
    this.selectedLocation = '';
    this.args.onFilterChange?.(this.currentFilters);
  }

  get currentFilters() {
    return {
      department: this.selectedDepartment,
      status: this.selectedStatus,
      location: this.selectedLocation,
    };
  }
}
```

### Pattern 5: Tour/Onboarding Completion Tracking

Tracking which tours or onboarding steps a user has completed:

```ts
import Service from '@ember/service';
import { localStorage } from 'ember-local-storage-decorator';

export default class OnboardingService extends Service {
  @localStorage('completed-tours')
  completedTours: string[] = [];

  @localStorage('dismissed-banners')
  dismissedBanners: string[] = [];

  hasTourCompleted(tourId: string): boolean {
    return this.completedTours.includes(tourId);
  }

  completeTour(tourId: string) {
    if (!this.completedTours.includes(tourId)) {
      this.completedTours = [...this.completedTours, tourId];
    }
  }

  isBannerDismissed(bannerId: string): boolean {
    return this.dismissedBanners.includes(bannerId);
  }

  dismissBanner(bannerId: string) {
    if (!this.dismissedBanners.includes(bannerId)) {
      this.dismissedBanners = [...this.dismissedBanners, bannerId];
    }
  }

  resetAllTours() {
    this.completedTours = [];
  }
}
```

### Pattern 6: Recently Viewed Items

```ts
import Service from '@ember/service';
import { localStorage } from 'ember-local-storage-decorator';

interface RecentItem {
  id: string;
  name: string;
  type: string;
  viewedAt: string; // ISO string (dates are stored as strings in JSON)
}

export default class RecentItemsService extends Service {
  @localStorage('recent-items')
  items: RecentItem[] = [];

  addItem(id: string, name: string, type: string) {
    const filtered = this.items.filter((item) => item.id !== id);
    const updated = [
      { id, name, type, viewedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, 20); // Keep last 20

    this.items = updated;
  }

  getByType(type: string): RecentItem[] {
    return this.items.filter((item) => item.type === type);
  }

  clear() {
    this.items = [];
  }
}
```

---
