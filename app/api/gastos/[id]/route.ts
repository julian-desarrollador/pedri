import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Gasto from '@/models/Gasto';


// GET - Obtener un gasto
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const gasto = await Gasto.findById(params.id).populate('propiedadId', 'nombre');
    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ gasto });
  } catch (error) {
    console.error('Error obteniendo gasto:', error);
    return NextResponse.json(
      { error: 'Error obteniendo gasto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const data = await request.json();

    // Misma forma que el alta: nota/notas y la etiqueta `tipo` de la UI.
    const { notas, nota, tipo, ...rest } = data || {};
    const payload: any = { ...rest };
    if (nota != null) payload.nota = String(nota).trim();
    else if (notas != null) payload.nota = String(notas).trim();
    if (tipo != null && String(tipo).trim()) payload.tipo = String(tipo).trim();

    const gasto = await Gasto.findByIdAndUpdate(params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('propiedadId', 'nombre');

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ gasto });
  } catch (error) {
    console.error('Error actualizando gasto:', error);
    return NextResponse.json(
      { error: 'Error actualizando gasto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar gasto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const gasto = await Gasto.findByIdAndDelete(params.id);

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Gasto eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando gasto:', error);
    return NextResponse.json(
      { error: 'Error eliminando gasto' },
      { status: 500 }
    );
  }
}


