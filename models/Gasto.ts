import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGasto extends Document {
  propiedadId: mongoose.Types.ObjectId;
  categoria: 'limpieza' | 'mantenimiento' | 'servicios' | 'impuestos' | 'otros';
  fecha: Date;
  monto: number;
  moneda: 'ARS' | 'USD';
  /** Etiqueta elegida en la UI (Wifi, Cable, Sueldo, etc.). La categoría sigue siendo el agrupador. */
  tipo?: string;
  nota?: string;
  descripcion?: string;
  proveedor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GastoSchema = new Schema<IGasto>(
  {
    propiedadId: {
      type: Schema.Types.ObjectId,
      ref: 'Propiedad',
      required: [true, 'La propiedad es requerida'],
    },
    categoria: {
      type: String,
      enum: ['limpieza', 'mantenimiento', 'servicios', 'impuestos', 'otros'],
      required: [true, 'La categoría es requerida'],
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha es requerida'],
    },
    monto: {
      type: Number,
      required: [true, 'El monto es requerido'],
      min: 0,
    },
    moneda: {
      type: String,
      enum: ['ARS', 'USD'],
      required: [true, 'La moneda es requerida'],
    },
    tipo: {
      type: String,
      trim: true,
    },
    nota: {
      type: String,
    },
    descripcion: {
      type: String,
    },
    proveedor: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para listados y análisis por propiedad y fecha
GastoSchema.index({ propiedadId: 1, fecha: -1 });

// En desarrollo, Next puede conservar un modelo compilado con el schema viejo
// y descartar campos nuevos (como `tipo`).
const MODEL_NAME = 'Gasto';
if (process.env.NODE_ENV === 'development' && mongoose.models[MODEL_NAME]) {
  delete mongoose.models[MODEL_NAME];
}

const Gasto: Model<IGasto> =
  (mongoose.models[MODEL_NAME] as Model<IGasto>) ||
  mongoose.model<IGasto>(MODEL_NAME, GastoSchema);

export default Gasto;


