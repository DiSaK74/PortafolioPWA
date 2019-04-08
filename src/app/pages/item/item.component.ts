import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InfoPaginaService } from './../../services/info-pagina.service';
import { Producto } from './../../interfaces/producto.interface';
import { InfoProductos } from './../../interfaces/info-productos.interface';

@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.sass']
})
export class ItemComponent implements OnInit {

  item: InfoProductos;
  id: string;

  constructor(
    private route: ActivatedRoute,
    public _infoPag: InfoPaginaService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(
      (params) => {
        this.item = this._infoPag.getProducto(params.id);
        this.id = params.id;
      }
    );
  }

}
