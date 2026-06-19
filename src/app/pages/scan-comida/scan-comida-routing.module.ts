import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ScanComidaPage } from './scan-comida.page';

const routes: Routes = [
  {
    path: '',
    component: ScanComidaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ScanComidaPageRoutingModule {}
