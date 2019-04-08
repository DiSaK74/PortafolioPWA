import { Component, OnInit } from '@angular/core';
import { InfoPaginaService } from './../../services/info-pagina.service';
import { InfoProductosIdx } from './../../interfaces/info-productos-idx.interface';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.sass']
})
export class HeaderComponent implements OnInit {
  tmpProductos: InfoProductosIdx[];

  constructor(
    public _infoPagina: InfoPaginaService
  ) { }

  ngOnInit() {
    this._infoPagina.leerProductos_idx().subscribe(
      (res: InfoProductosIdx[]) => {
        this.tmpProductos = res;
      }
    );
  }

  changeBuscar(texto: string) {
    if (texto.length >= 1) {
      this._infoPagina.productos_idx = this.tmpProductos
        .filter(
          producto => {
            return producto.titulo.toLocaleLowerCase().match(texto.toLocaleLowerCase());
          }
        );
    } else {
      this._infoPagina.productos_idx = this.tmpProductos;
    }
  }

}
