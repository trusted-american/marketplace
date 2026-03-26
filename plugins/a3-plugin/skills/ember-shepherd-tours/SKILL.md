---
name: ember-shepherd-tours
description: ember-shepherd + shepherd.js reference — user onboarding tours and feature walkthroughs in A3
version: 0.1.0
---

# ember-shepherd + shepherd.js Reference

ember-shepherd wraps shepherd.js to provide guided product tours and feature walkthroughs in Ember applications. A3 uses it for onboarding new users, introducing features, and contextual help.

## Installation

```bash
pnpm add ember-shepherd
```

ember-shepherd bundles shepherd.js as a dependency. No separate install needed.

## A3 Tour Service

A3 injects the `tour` service provided by ember-shepherd:

```typescript
import Service, { inject as service } from '@ember/service';
import type TourService from 'ember-shepherd/services/tour';

export default class OnboardingService extends Service {
  @service declare tour: TourService;
}
```

### Tour Service Properties

| Property              | Type       | Description                                         |
|-----------------------|------------|-----------------------------------------------------|
| `tour.isActive`       | boolean    | Whether a tour is currently running                 |
| `tour.currentStep`    | Step       | The currently displayed step object                 |
| `tour.steps`          | Step[]     | All registered steps                                |

## Defining and Starting a Tour

### addSteps()

```typescript
this.tour.addSteps([
  {
    id: 'welcome',
    text: 'Welcome to A3! Let us show you around.',
    buttons: [
      {
        text: 'Skip',
        action: this.tour.cancel,
        classes: 'btn-secondary',
      },
      {
        text: 'Next',
        action: this.tour.next,
        classes: 'btn-primary',
      },
    ],
  },
  {
    id: 'dashboard-overview',
    text: 'This is your dashboard. You can see all your enrollments and tasks here.',
    attachTo: {
      element: '.dashboard-summary',
      on: 'bottom',          // 'top' | 'bottom' | 'left' | 'right'
    },
    buttons: [
      {
        text: 'Back',
        action: this.tour.back,
        classes: 'btn-secondary',
      },
      {
        text: 'Next',
        action: this.tour.next,
        classes: 'btn-primary',
      },
    ],
  },
  {
    id: 'create-enrollment',
    text: 'Click here to create a new enrollment.',
    attachTo: {
      element: '#create-enrollment-btn',
      on: 'right',
    },
    buttons: [
      {
        text: 'Back',
        action: this.tour.back,
        classes: 'btn-secondary',
      },
      {
        text: 'Done',
        action: this.tour.complete,
        classes: 'btn-primary',
      },
    ],
  },
]);
```

### start()

```typescript
this.tour.start();
```

### cancel()

```typescript
this.tour.cancel();
// Fires the 'cancel' event
```

### complete()

```typescript
this.tour.complete();
// Fires the 'complete' event — different from cancel
```

## Step Configuration

### Full Step Options

```typescript
interface StepOptions {
  id: string;                        // Unique step identifier
  text: string | HTMLElement;        // Step content (supports HTML)
  title?: string;                    // Step title (displayed above text)

  attachTo?: {
    element: string | HTMLElement;   // CSS selector or DOM element
    on: 'top' | 'bottom' | 'left' | 'right' |
        'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' |
        'left-start' | 'left-end' | 'right-start' | 'right-end';
    type?: string;                   // Popper.js placement type
  };

  buttons?: Array<{
    text: string;
    action: () => void;              // Usually this.tour.next, .back, .cancel, .complete
    classes?: string;                // CSS classes for the button
    secondary?: boolean;             // Style as secondary button
    disabled?: boolean;
    label?: string;                  // ARIA label
  }>;

  advanceOn?: {
    selector: string;                // CSS selector of element
    event: string;                   // DOM event that advances (e.g. 'click')
  };

  showCancelLink?: boolean;          // Show X button (default: true in A3)
  cancelIcon?: {
    enabled: boolean;
    label?: string;                  // ARIA label for cancel icon
  };

  canClickTarget?: boolean;          // Allow clicking the attached element (default: true)
  scrollTo?: boolean | ScrollIntoViewOptions; // Auto-scroll to element
  modalOverlayOpeningRadius?: number; // Rounded corners on overlay cutout
  modalOverlayOpeningPadding?: number; // Padding around overlay cutout

  classes?: string;                  // Additional CSS classes on the step element

  // Lifecycle hooks
  beforeShowPromise?: () => Promise<void>;
  when?: {
    show?: () => void;
    hide?: () => void;
    cancel?: () => void;
    complete?: () => void;
    destroy?: () => void;
  };
}
```

### HTML Content in Steps

```typescript
{
  id: 'rich-content',
  text: `
    <h3>Enrollment Status</h3>
    <p>Track your enrollment progress here:</p>
    <ul>
      <li><strong>Pending</strong> — Awaiting review</li>
      <li><strong>Active</strong> — Enrollment confirmed</li>
      <li><strong>Completed</strong> — All steps done</li>
    </ul>
  `,
  attachTo: { element: '.status-panel', on: 'left' },
}
```

### advanceOn — Auto-Advance on User Action

Instead of a "Next" button, advance when the user performs an action:

```typescript
{
  id: 'click-create',
  text: 'Go ahead and click "Create Enrollment" to continue.',
  attachTo: { element: '#create-btn', on: 'bottom' },
  advanceOn: {
    selector: '#create-btn',
    event: 'click',
  },
  buttons: [], // No buttons — advances on click
}
```

## Step Lifecycle Actions

### beforeShowPromise

Run async work before a step displays (e.g., navigate to a route):

```typescript
{
  id: 'enrollments-page',
  text: 'This is the enrollments list.',
  attachTo: { element: '.enrollments-table', on: 'top' },
  beforeShowPromise: () => {
    return new Promise<void>((resolve) => {
      this.router.transitionTo('enrollments').then(() => {
        // Wait for DOM to settle
        setTimeout(resolve, 500);
      });
    });
  },
}
```

### when — Lifecycle Hooks

```typescript
{
  id: 'feature-step',
  text: 'Check out this feature.',
  when: {
    show: () => {
      console.log('Step is now visible');
      // Highlight something, start animation, etc.
      document.querySelector('.feature')?.classList.add('highlighted');
    },
    hide: () => {
      console.log('Step is being hidden');
      document.querySelector('.feature')?.classList.remove('highlighted');
    },
    cancel: () => {
      console.log('Tour was cancelled on this step');
    },
    complete: () => {
      console.log('Tour completed on this step');
    },
    destroy: () => {
      console.log('Step DOM destroyed');
    },
  },
}
```

## Tour-Level Configuration

### Default Step Options

Set defaults for all steps:

```typescript
this.tour.set('defaultStepOptions', {
  scrollTo: { behavior: 'smooth', block: 'center' },
  showCancelLink: true,
  cancelIcon: { enabled: true },
  modalOverlayOpeningPadding: 8,
  modalOverlayOpeningRadius: 4,
  canClickTarget: false,
  classes: 'a3-tour-step',
});
```

### Modal Overlay

```typescript
this.tour.set('modal', true);
// Shows a dark overlay with a cutout around the attached element
// Prevents interaction with the rest of the page
```

### Tour Events

```typescript
this.tour.on('start', () => {
  console.log('Tour started');
});

this.tour.on('complete', () => {
  console.log('Tour completed');
  this.markTourComplete('onboarding');
});

this.tour.on('cancel', () => {
  console.log('Tour cancelled');
  this.markTourDismissed('onboarding');
});

this.tour.on('show', (event) => {
  console.log('Showing step:', event.step.id);
});

this.tour.on('hide', (event) => {
  console.log('Hiding step:', event.step.id);
});
```

## Styling

### Default CSS Import

```scss
// In your app.scss
@import 'shepherd.js/dist/css/shepherd.css';
```

### Custom Styling

```scss
// Override Shepherd theme
.shepherd-element {
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 10000;
}

.shepherd-content {
  padding: 0;
}

.shepherd-header {
  background: #1a73e8;
  padding: 12px 16px;
  border-radius: 8px 8px 0 0;
}

.shepherd-title {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.shepherd-cancel-icon {
  color: white;
  font-size: 20px;
}

.shepherd-text {
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.shepherd-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.shepherd-button {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.shepherd-button.btn-primary {
  background: #1a73e8;
  color: white;
}

.shepherd-button.btn-secondary {
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
}

// Modal overlay
.shepherd-modal-overlay-container {
  fill: rgba(0, 0, 0, 0.5);
}

// Arrow
.shepherd-arrow {
  border-width: 8px;
}

// Step progress indicator
.a3-tour-step .shepherd-text::before {
  content: attr(data-step-number);
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}
```

## Responsive Behavior

Handle mobile/small screens:

```typescript
{
  id: 'responsive-step',
  text: 'This feature helps you manage enrollments.',
  attachTo: {
    element: '.feature-panel',
    on: window.innerWidth < 768 ? 'bottom' : 'right',
  },
  scrollTo: { behavior: 'smooth', block: 'center' },
}
```

For dynamic positioning, recalculate on resize:

```typescript
window.addEventListener('resize', () => {
  if (this.tour.isActive) {
    const currentStep = this.tour.currentStep;
    if (currentStep) {
      // Shepherd auto-repositions with Popper.js
      // but you may need to manually trigger for complex layouts
      currentStep.updateStepOptions({
        attachTo: {
          element: currentStep.options.attachTo.element,
          on: window.innerWidth < 768 ? 'bottom' : 'right',
        },
      });
    }
  }
});
```

## Tracking Tour Completion

A3 tracks which tours a user has seen in Firestore to avoid repeating:

```typescript
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

async function hasCompletedTour(userId: string, tourId: string): Promise<boolean> {
  const tourDoc = await getDoc(
    doc(this.db, 'users', userId, 'tours', tourId)
  );
  return tourDoc.exists() && tourDoc.data()?.completed === true;
}

async function markTourComplete(userId: string, tourId: string) {
  await setDoc(doc(this.db, 'users', userId, 'tours', tourId), {
    completed: true,
    completedAt: serverTimestamp(),
  });
}

async function markTourDismissed(userId: string, tourId: string) {
  await setDoc(doc(this.db, 'users', userId, 'tours', tourId), {
    dismissed: true,
    dismissedAt: serverTimestamp(),
  });
}

// In the onboarding service
async maybeStartOnboardingTour() {
  const completed = await hasCompletedTour(this.userId, 'onboarding-v2');
  if (!completed) {
    this.setupOnboardingSteps();
    this.tour.start();
  }
}
```

## Full A3 Onboarding Tour Example

```typescript
// app/services/onboarding.ts
import Service, { inject as service } from '@ember/service';
import type TourService from 'ember-shepherd/services/tour';
import type RouterService from '@ember/routing/router-service';

export default class OnboardingService extends Service {
  @service declare tour: TourService;
  @service declare router: RouterService;

  setupTour() {
    this.tour.set('defaultStepOptions', {
      scrollTo: { behavior: 'smooth', block: 'center' },
      showCancelLink: true,
      cancelIcon: { enabled: true },
      modalOverlayOpeningPadding: 8,
      classes: 'a3-onboarding-step',
    });

    this.tour.set('modal', true);

    this.tour.addSteps([
      {
        id: 'welcome',
        title: 'Welcome to A3',
        text: 'Let us give you a quick tour of the platform. This will only take a minute.',
        buttons: [
          { text: 'Skip Tour', action: this.tour.cancel, classes: 'btn-secondary' },
          { text: 'Start Tour', action: this.tour.next, classes: 'btn-primary' },
        ],
      },
      {
        id: 'sidebar-nav',
        title: 'Navigation',
        text: 'Use the sidebar to navigate between different sections of the app.',
        attachTo: { element: '.sidebar-nav', on: 'right' },
        buttons: [
          { text: 'Back', action: this.tour.back, classes: 'btn-secondary' },
          { text: 'Next', action: this.tour.next, classes: 'btn-primary' },
        ],
      },
      {
        id: 'enrollment-list',
        title: 'Enrollments',
        text: 'View and manage all your enrollments from this list.',
        attachTo: { element: '.enrollment-table', on: 'top' },
        beforeShowPromise: () => {
          return this.router.transitionTo('enrollments').then(() => {
            return new Promise<void>((resolve) => setTimeout(resolve, 300));
          });
        },
        buttons: [
          { text: 'Back', action: this.tour.back, classes: 'btn-secondary' },
          { text: 'Next', action: this.tour.next, classes: 'btn-primary' },
        ],
      },
      {
        id: 'done',
        title: 'You are all set!',
        text: 'You are ready to start using A3. If you need help, click the chat icon in the bottom right.',
        buttons: [
          { text: 'Finish', action: this.tour.complete, classes: 'btn-primary' },
        ],
      },
    ]);

    this.tour.on('complete', () => this.markComplete());
    this.tour.on('cancel', () => this.markDismissed());

    this.tour.start();
  }
}
```

## Common Pitfalls

1. **Element not found:** If `attachTo.element` does not exist in the DOM when the step shows, the step renders centered/floating. Use `beforeShowPromise` to ensure the element is rendered.
2. **Route transitions:** Steps attached to elements on different routes need `beforeShowPromise` to navigate first.
3. **Z-index conflicts:** Shepherd uses z-index ~9999. Modals or sticky headers may overlap. Adjust `.shepherd-element` z-index as needed.
4. **Memory leaks:** Always call `this.tour.cancel()` in `willDestroy` if a tour might be running when the component is torn down.
5. **Multiple tours:** Only one tour can run at a time. Starting a new tour while one is active cancels the first.
