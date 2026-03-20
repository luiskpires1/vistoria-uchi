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
  propertyDescription?: string;
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
    // Increased size to 30x30 and aligned with text at x=45
    doc.addImage(logoUrl, 'PNG', 10, 2.5, 30, 30);
  } catch (e) {
    console.warn('Could not load logo for PDF, skipping...', e);
    // If logo fails, we just continue without it
  }

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Uchi Imóveis', 45, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('CNPJ 63.595.950/0001-26 | CRECI 28561', 45, 19);
  doc.text('E-mail: contato@uchiimoveis.com', 45, 24);
  doc.text('Endereço: Rua Alcides Gonzaga 240, Boa Vista, Porto Alegre - RS, CEP: 90480-020', 45, 29);

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

  // Property Description Section
  let currentY = partiesY + 10;
  
  if (data.propertyDescription) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 58, 90);
    doc.text('DESCRIÇÃO DO IMÓVEL', 20, currentY);
    currentY += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    const splitPropDesc = doc.splitTextToSize(data.propertyDescription, pageWidth - 40);
    doc.text(splitPropDesc, 20, currentY);
    currentY += (splitPropDesc.length * 5) + 10;
  } else {
    currentY += 5;
  }

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
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fotos do Ambiente - ${room.name}`, 20, currentY);
      currentY += 10;

      let photoX = 20;
      const photoSize = 80; 
      const spacing = 10;

      for (const photo of room.photos) {
        try {
          if (photoX + photoSize > pageWidth - 15) {
            photoX = 20;
            currentY += photoSize + spacing;
          }

          if (currentY + photoSize > 270) {
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
      currentY += photoSize + 15;
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

    // Photos for each item in this room
    for (const item of room.items) {
      if (item.photos && item.photos.length > 0) {
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 58, 90);
        const itemTitle = `Fotos - ${room.name} - ${item.name}${item.hasFurniture ? ' - Com Avaria' : ''}`;
        doc.text(itemTitle, 20, currentY);
        currentY += 7;

        // Observations (Description)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        const obsText = item.description || 'Sem observações';
        const splitObs = doc.splitTextToSize(`Observações: ${obsText}`, pageWidth - 40);
        doc.text(splitObs, 20, currentY);
        currentY += (splitObs.length * 5) + 2;

        // Damage Description
        if (item.hasFurniture && item.furnitureDescription) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 0, 0); // Red for damage description
          const splitAvaria = doc.splitTextToSize(`Descrição da Avaria: ${item.furnitureDescription}`, pageWidth - 40);
          doc.text(splitAvaria, 20, currentY);
          currentY += (splitAvaria.length * 5) + 5;
          doc.setTextColor(0, 58, 90); // Reset color
        } else {
          currentY += 5;
        }

        let photoX = 20;
        const photoSize = 80; 
        const spacing = 10;

        for (const photo of item.photos) {
          try {
            // Check if we need a new row or page
            if (photoX + photoSize > pageWidth - 15) {
              photoX = 20;
              currentY += photoSize + spacing;
            }

            if (currentY + photoSize > 270) {
              doc.addPage();
              currentY = 20;
              photoX = 20;
            }

            doc.addImage(photo, 'JPEG', photoX, currentY, photoSize, photoSize);
            photoX += photoSize + spacing;
          } catch (e) {
            console.error('Error adding item image to PDF:', e);
          }
        }
        currentY += photoSize + 20;
      }
    }
  }

  // Signatures Section
  if (currentY > 200) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY += 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 58, 90);
  doc.text('TERMO DE ENCERRAMENTO E ASSINATURAS', pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const closureText = "As partes acima identificadas declaram estar de acordo com o estado de conservação do imóvel descrito neste laudo de vistoria, ratificando todas as informações e fotos aqui constantes.";
  const splitClosure = doc.splitTextToSize(closureText, pageWidth - 40);
  doc.text(splitClosure, 20, currentY);
  currentY += (splitClosure.length * 5) + 20;

  const sigWidth = 65;
  const sigSpacing = 20;
  const totalWidth = (sigWidth * 2) + sigSpacing;
  const startX = (pageWidth - totalWidth) / 2;

  // Row 1: Vistoriador and Owner/Buyer
  // Vistoriador
  doc.setDrawColor(150, 150, 150);
  doc.line(startX, currentY, startX + sigWidth, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text('Vistoriador', startX + sigWidth / 2, currentY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(data.inspector.name, startX + sigWidth / 2, currentY + 10, { align: 'center' });
  doc.text(`CPF: ${data.inspector.cpf}`, startX + sigWidth / 2, currentY + 14, { align: 'center' });

  // Owner/Buyer
  const secondLabel = data.type === 'venda' ? 'Comprador' : 'Proprietário';
  const secondPerson = data.type === 'venda' ? data.buyer : data.owner;
  if (secondPerson && secondPerson.name) {
    const x = startX + sigWidth + sigSpacing;
    doc.line(x, currentY, x + sigWidth, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(secondLabel, x + sigWidth / 2, currentY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(secondPerson.name, x + sigWidth / 2, currentY + 10, { align: 'center' });
    doc.text(`CPF: ${secondPerson.cpf}`, x + sigWidth / 2, currentY + 14, { align: 'center' });
  }

  currentY += 35;

  // Row 2: Tenant/Seller
  const thirdLabel = data.type === 'venda' ? 'Vendedor' : 'Inquilino';
  const thirdPerson = data.type === 'venda' ? data.seller : data.tenant;
  if (thirdPerson && thirdPerson.name) {
    const x = (pageWidth - sigWidth) / 2;
    doc.line(x, currentY, x + sigWidth, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(thirdLabel, x + sigWidth / 2, currentY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(thirdPerson.name, x + sigWidth / 2, currentY + 10, { align: 'center' });
    doc.text(`CPF: ${thirdPerson.cpf}`, x + sigWidth / 2, currentY + 14, { align: 'center' });
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
