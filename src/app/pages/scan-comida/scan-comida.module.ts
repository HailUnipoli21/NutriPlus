import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ScanComidaPageRoutingModule } from './scan-comida-routing.module';

import { ScanComidaPage } from './scan-comida.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScanComidaPageRoutingModule
  ],
  declarations: [ScanComidaPage]
})
export class ScanComidaPageModule {}
