import { Component, OnInit } from '@angular/core';
import { InfoPaginaService } from './../../services/info-pagina.service';

@Component({
  selector: 'app-portafolio',
  templateUrl: './portafolio.component.html',
  styleUrls: ['./portafolio.component.sass']
})
export class PortafolioComponent implements OnInit {

  constructor(
              public _infoPag: InfoPaginaService
  ) { }

  ngOnInit() {
  }

}
