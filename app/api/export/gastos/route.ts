import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Gasto from '@/models/Gasto';

function toCsv(rows: Array<Record<string, any>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: any) => {
    if (val == null) return '';
    const s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const sp = request.nextUrl.searchParams;
    const propiedadId = sp.get('propiedadId');
    const categoria = sp.get('categoria');
    const from = sp.get('from');
    const to = sp.get('to');

    const query: any = {};
    if (propiedadId) query.propiedadId = propiedadId;
    if (categoria) query.categoria = categoria;
    if (from || to) {
      query.fecha = {};
      if (from) query.fecha.$gte = new Date(from);
      if (to) query.fecha.$lte = new Date(to);
    }

    const gastos = await Gasto.find(query)
      .populate('propiedadId', 'nombre')
      .sort({ fecha: -1 });

    const rows = gastos.map((g: any) => ({
      gastoId: g._id,
      propiedad: g.propiedadId?.nombre || '',
      categoria: g.categoria,
      fecha: g.fecha?.toISOString()?.slice(0, 10),
      monto: g.monto,
      moneda: g.moneda,
      nota: g.nota || g.descripcion || '',
      proveedor: g.proveedor || '',
      createdAt: g.createdAt?.toISOString(),
      tipo: g.tipo || '',
    }));

    const csv = toCsv(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gastos.csv"',
      },
    });
  } catch (error) {
    console.error('Error exportando gastos:', error);
    return NextResponse.json({ error: 'Error exportando gastos' }, { status: 500 });
  }
}


