import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Person {
  name: string;
  cpf: string;
}

interface Property {
  address: string;
  complement?: string;
  neighborhood: string;
  city: string;
  cep: string;
}

interface InspectionData {
  property: Property;
  type: string;
  date: string;
  status: string;
  inspector: Person;
  owner?: Person;
  tenant?: Person;
  buyer?: Person;
  seller?: Person;
  rooms: {
    name: string;
    description?: string;
    photos?: string[];
    items: {
      name: string;
      condition: string;
      description: string;
      hasFurniture: boolean;
      furnitureDescription?: string;
      photos: string[];
    }[];
  }[];
}

export const generateInspectionPDF = async (data: InspectionData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Company Header Background
  doc.setFillColor(0, 58, 90);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Company Header
  const logoUrl = '/logo.png';
  try {
    // Attempt to add logo, but don't crash if it fails
    // Using a more robust approach by checking if it's a valid image first or just catching the error
    doc.addImage(logoUrl, 'PNG', 20, 10, 15, 15);
  } catch (e) {
    console.warn('Could not load logo for PDF, skipping...', e);
    // If logo fails, we just continue without it
  }

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Uchi Imóveis', 38, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('CNPJ 63.595.950/0001-26 | CRECI 28561', 38, 21);
  doc.text('E-mail: contato@uchiimoveis.com', 38, 25);
  doc.text('Endereço: Rua Alcides Gonzaga 240, Boa Vista, Porto Alegre - RS, CEP: 90480-020', 38, 29);

  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO DE VISTORIA IMOBILIÁRIA', pageWidth / 2, 48, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 56, { align: 'center' });

  // Property Info
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 62, pageWidth - 20, 62);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO IMÓVEL', 20, 72);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Endereço: ${data.property.address}${data.property.complement ? ', ' + data.property.complement : ''}`, 20, 79);
  doc.text(`Bairro: ${data.property.neighborhood}`, 20, 85);
  doc.text(`Cidade: ${data.property.city} - CEP: ${data.property.cep}`, 20, 91);

  // Inspection Info
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 58, 90);
  doc.text('DADOS DA VISTORIA', 120, 72);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Tipo: ${data.type.toUpperCase()}`, 120, 79);
  doc.text(`Data: ${new Date(data.date).toLocaleDateString('pt-BR')}`, 120, 85);
  doc.text(`Status: ${data.status === 'completed' ? 'FINALIZADA' : 'EM RASCUNHO'}`, 120, 91);

  // Parties Info
  doc.line(20, 99, pageWidth - 20, 99);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 58, 90);
  doc.text('PARTES ENVOLVIDAS', 20, 107);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  let partiesY = 114;
  doc.text(`Vistoriador: ${data.inspector.name} (CPF: ${data.inspector.cpf})`, 20, partiesY);
  partiesY += 6;

  if (data.type === 'venda') {
    if (data.seller) {
      doc.text(`Vendedor: ${data.seller.name} (CPF: ${data.seller.cpf})`, 20, partiesY);
      partiesY += 6;
    }
    if (data.buyer) {
      doc.text(`Comprador: ${data.buyer.name} (CPF: ${data.buyer.cpf})`, 20, partiesY);
      partiesY += 6;
    }
  } else {
    if (data.owner) {
      doc.text(`Proprietário: ${data.owner.name} (CPF: ${data.owner.cpf})`, 20, partiesY);
      partiesY += 6;
    }
    if (data.tenant) {
      doc.text(`Inquilino: ${data.tenant.name} (CPF: ${data.tenant.cpf})`, 20, partiesY);
      partiesY += 6;
    }
  }

  let currentY = partiesY + 10;

  // Rooms and Items
  for (const room of data.rooms) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 58, 90);
    doc.text(room.name, 20, currentY);
    currentY += 8;

    if (room.description) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      const splitDesc = doc.splitTextToSize(`Descrição: ${room.description}`, pageWidth - 40);
      doc.text(splitDesc, 20, currentY);
      currentY += (splitDesc.length * 5) + 5;
    } else {
      currentY += 2;
    }

    // Room Photos
    if (room.photos && room.photos.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }
      
      let photoX = 20;
      const photoSize = 40;
      const spacing = 5;

      for (const photo of room.photos) {
        try {
          if (photoX + photoSize > pageWidth - 20) {
            photoX = 20;
            currentY += photoSize + spacing;
          }

          if (currentY + photoSize > 280) {
            doc.addPage();
            currentY = 20;
            photoX = 20;
          }

          doc.addImage(photo, 'JPEG', photoX, currentY, photoSize, photoSize);
          photoX += photoSize + spacing;
        } catch (e) {
          console.error('Error adding room image to PDF:', e);
        }
      }
      currentY += photoSize + 10;
    }

    const tableData = room.items.map(item => [
      item.name,
      item.condition.toUpperCase(),
      item.description || 'Sem observações',
      item.hasFurniture ? (item.furnitureDescription || 'Sim') : 'Não'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Item', 'Estado', 'Observações', 'Avaria?']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 58, 90], textColor: 'white' },
      margin: { left: 20, right: 20 },
      didDrawPage: (data: any) => {
        currentY = data.cursor.y + 10;
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Photos for this room
    const photos = room.items.flatMap(item => item.photos);
    if (photos.length > 0) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fotos - ${room.name}`, 20, currentY);
      currentY += 10;

      let photoX = 20;
      const photoSize = 40;
      const spacing = 5;

      for (const photo of photos) {
        try {
          // Check if we need a new row or page
          if (photoX + photoSize > pageWidth - 20) {
            photoX = 20;
            currentY += photoSize + spacing;
          }

          if (currentY + photoSize > 280) {
            doc.addPage();
            currentY = 20;
            photoX = 20;
          }

          doc.addImage(photo, 'JPEG', photoX, currentY, photoSize, photoSize);
          photoX += photoSize + spacing;
        } catch (e) {
          console.error('Error adding image to PDF:', e);
        }
      }
      currentY += photoSize + 20;
    }
  }

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Uchi Imóveis',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 15,
      { align: 'center' }
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`laudo-vistoria-${data.property.address.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};
