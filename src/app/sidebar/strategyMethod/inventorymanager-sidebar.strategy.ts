import {Injectable} from '@angular/core';
import {ISidebarStrategy} from './sidebar.strategy';
import {SidebarItem} from '../sidebar.interface';

@Injectable({ providedIn: 'root' })
export class InventorymanagerSidebarStrategy implements ISidebarStrategy {
  getMenuItems(): SidebarItem[] {
    return [
      {
        icon: 'pi-book',
        text: 'Inventory Management',
        route: './inventory-management',
        visible: true
      },
      {
        icon: 'pi-chart-bar',
        text: 'Report Generation',
        route: './report-generation',
        visible: true
      },
      {
        icon: 'pi-user',
        text: 'My Profile',
        route: './profile',
        visible: true
      }
    ];
  }
}
