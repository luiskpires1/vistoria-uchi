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
  
  // Logo
  try {
    const logoUrl = 'https://ais-dev-rwp7gfhhrnm5kvzj7mq5rl-136253274741.us-east1.run.app/logo.png';
    doc.addImage(logoUrl, 'PNG', 20, 10, 30, 30);
  } catch (e) {
    console.error('Error adding logo to PDF:', e);
  }

  // Header - Real Estate Info
  doc.setFontSize(10);
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('UCHI IMÓVEIS', 55, 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Endereço: Porto Alegre, RS', 55, 20);
  doc.text('CRECI: 28561 | CNPJ: 63.595.950/0001-26', 55, 24);
  doc.text('EMAIL: contato@uchiimoveis.com', 55, 28);
  doc.text('TELEFONE: 51 992852975', 55, 32);

  doc.setFontSize(18);
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO DE VISTORIA IMOBILIÁRIA', pageWidth / 2, 50, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 56, { align: 'center' });

  // Property Info
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 62, pageWidth - 20, 62);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO IMÓVEL', 20, 70);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Endereço: ${data.property.address}${data.property.complement ? ', ' + data.property.complement : ''}`, 20, 76);
  doc.text(`Bairro: ${data.property.neighborhood}`, 20, 81);
  doc.text(`Cidade: ${data.property.city} - CEP: ${data.property.cep}`, 20, 86);

  // Inspection Info
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 58, 90);
  doc.text('DADOS DA VISTORIA', 120, 70);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Tipo: ${data.type.toUpperCase()}`, 120, 76);
  doc.text(`Data: ${new Date(data.date).toLocaleDateString('pt-BR')}`, 120, 81);
  doc.text(`Status: ${data.status === 'completed' ? 'FINALIZADA' : 'EM RASCUNHO'}`, 120, 86);

  // Parties Info
  doc.line(20, 92, pageWidth - 20, 92);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 58, 90);
  doc.text('PARTES ENVOLVIDAS', 20, 100);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  let partiesY = 106;
  doc.text(`Vistoriador: ${data.inspector.name} (CPF: ${data.inspector.cpf})`, 20, partiesY);
  partiesY += 5;

  if (data.type === 'venda') {
    if (data.seller) {
      doc.text(`Vendedor: ${data.seller.name} (CPF: ${data.seller.cpf})`, 20, partiesY);
      partiesY += 5;
    }
    if (data.buyer) {
      doc.text(`Comprador: ${data.buyer.name} (CPF: ${data.buyer.cpf})`, 20, partiesY);
      partiesY += 5;
    }
  } else {
    if (data.owner) {
      doc.text(`Proprietário: ${data.owner.name} (CPF: ${data.owner.cpf})`, 20, partiesY);
      partiesY += 5;
    }
    if (data.tenant) {
      doc.text(`Inquilino: ${data.tenant.name} (CPF: ${data.tenant.cpf})`, 20, partiesY);
      partiesY += 5;
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
    currentY += 10;

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
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save(`laudo-vistoria-${data.property.address.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};
