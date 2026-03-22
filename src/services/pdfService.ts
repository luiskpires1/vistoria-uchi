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
  inspectorOpinion?: string;
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
    doc.addImage(logoUrl, 'PNG', 10, 2.5, 30, 30);
  } catch (e) {
    console.warn('Could not load logo for PDF, skipping...', e);
  }

  doc.setFontSize(14); // Standardized header title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Uchi Imóveis', 45, 13);

  doc.setFontSize(9); // Increased font size for header info
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('CNPJ 63.595.950/0001-26 | CRECI 28561', 45, 19);
  doc.text('E-mail: contato@uchiimoveis.com', 45, 24);
  doc.text('Endereço: Rua Alcides Gonzaga 240, Boa Vista, Porto Alegre - RS, CEP: 90480-020', 45, 29);

  // Title
  doc.setFontSize(16); // Standardized main title
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO DE VISTORIA IMOBILIÁRIA', pageWidth / 2, 48, { align: 'center' });
  
  doc.setFontSize(10); // Increased font size for generation date
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 55, { align: 'center' });

  // Helper for section headers
  const drawSectionHeader = (title: string, y: number) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y - 8, pageWidth - 40, 10, 'F'); // Increased rect height
    doc.setFontSize(10);
    doc.setTextColor(0, 58, 90);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 25, y);
    return y + 10; // Increased return value for more bottom padding
  };

  // Property Info
  doc.setDrawColor(230, 230, 230);
  doc.line(20, 62, pageWidth - 20, 62);
  
  let currentY = 75; // Increased initial Y
  drawSectionHeader('DADOS DO IMÓVEL', currentY);
  currentY += 10; // Spacing after header
  
  doc.setFontSize(11); // Increased font size
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Endereço: ${data.property.address}${data.property.complement ? ', ' + data.property.complement : ''}`, 25, currentY);
  currentY += 6;
  doc.text(`Bairro: ${data.property.neighborhood}`, 25, currentY);
  currentY += 6;
  doc.text(`Cidade: ${data.property.city} - CEP: ${data.property.cep}`, 25, currentY);
  currentY += 15; // Standardized spacing between sections

  // Inspection Info
  drawSectionHeader('DADOS DA VISTORIA', currentY);
  currentY += 10; // Spacing after header
  doc.setFontSize(11); // Increased font size
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Tipo: ${data.type.toUpperCase()}`, 25, currentY);
  currentY += 6;
  doc.text(`Data: ${new Date(data.date).toLocaleDateString('pt-BR')}`, 25, currentY);
  currentY += 6;
  doc.text(`Status: ${data.status === 'completed' ? 'FINALIZADA' : 'EM RASCUNHO'}`, 25, currentY);
  currentY += 15; // Standardized spacing between sections

  // Parties Info
  if (currentY > 260) { doc.addPage(); currentY = 25; }
  drawSectionHeader('PARTES ENVOLVIDAS', currentY);
  currentY += 10; // Spacing after header
  
  doc.setFontSize(11); // Increased font size
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  doc.text(`Vistoriador: ${data.inspector.name} (CPF: ${data.inspector.cpf})`, 25, currentY);
  currentY += 6;

  if (data.type === 'venda') {
    if (data.seller) {
      doc.text(`Vendedor: ${data.seller.name} (CPF: ${data.seller.cpf})`, 25, currentY);
      currentY += 6;
    }
    if (data.buyer) {
      doc.text(`Comprador: ${data.buyer.name} (CPF: ${data.buyer.cpf})`, 25, currentY);
      currentY += 6;
    }
  } else {
    if (data.owner) {
      doc.text(`Proprietário: ${data.owner.name} (CPF: ${data.owner.cpf})`, 25, currentY);
      currentY += 6;
    }
    if (data.tenant) {
      doc.text(`Inquilino: ${data.tenant.name} (CPF: ${data.tenant.cpf})`, 25, currentY);
      currentY += 6;
    }
  }

  // Evaluation Criteria Section
  currentY += 9; // Adjusted to result in 15pt gap from last line (6+9=15)
  if (currentY > 240) { doc.addPage(); currentY = 25; }
  
  drawSectionHeader('CRITÉRIOS DE AVALIAÇÃO DO ESTADO DE CONSERVAÇÃO', currentY);
  currentY += 10; // Spacing after header
  
  doc.setFontSize(11); // Increased font size
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Novo: Primeiro uso.', 25, currentY);
  doc.text('Bom: Sem grandes sinais de desgastes ou com pequenas irregularidades.', 25, currentY + 5);
  doc.text('Regular: Com avarias.', 25, currentY + 10);
  doc.text('Ruim: Com danos graves/relevantes.', 25, currentY + 15);
  currentY += 30; // Set currentY to 15pt below the last line of this section

  // Property Description Section
  if (data.propertyDescription) {
    currentY += 15; // Standard 15pt gap between sections
    if (currentY > 240) { doc.addPage(); currentY = 25; }
    drawSectionHeader('DESCRIÇÃO DO IMÓVEL', currentY);
    currentY += 10; // Spacing after header
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11); // Increased font size
    const splitPropDesc = doc.splitTextToSize(data.propertyDescription, pageWidth - 50);
    doc.text(splitPropDesc, 25, currentY);
    currentY += (splitPropDesc.length * 5) + 15;
  }

  // Rooms and Items
  for (const room of data.rooms) {
    // Smart page break: Calculate minimum height needed for room header + first content
    let minRoomHeight = 30; // Line + Title + Padding
    if (room.description) minRoomHeight += 15;
    if (room.photos && room.photos.length > 0) minRoomHeight += 60; // Title + at least one photo row
    else if (room.items && room.items.length > 0) minRoomHeight += 40; // Table header + at least one row

    if (currentY + minRoomHeight > 280) { 
      doc.addPage(); 
      currentY = 25; 
    }

    doc.setDrawColor(0, 58, 90);
    doc.setLineWidth(0.5);
    doc.line(20, currentY, pageWidth - 20, currentY);
    currentY += 10;

    doc.setFontSize(12); // Standardized room title size
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 58, 90);
    doc.text(room.name.toUpperCase(), 20, currentY);
    currentY += 8;

    if (room.description) {
      doc.setFontSize(11); // Increased font size
      doc.setFont('helvetica', 'normal'); // Removed italics
      doc.setTextColor(80, 80, 80);
      const splitDesc = doc.splitTextToSize(`Observação: ${room.description}`, pageWidth - 40);
      doc.text(splitDesc, 20, currentY);
      currentY += (splitDesc.length * 5) + 5;
    } else {
      currentY += 2;
    }

    // Room Photos
    if (room.photos && room.photos.length > 0) {
      // Only break if we are really at the bottom, otherwise the smart break at the start handled it
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fotos do Ambiente - ${room.name}`, 20, currentY);
      currentY += 10;

      const photoWidth = (pageWidth - 50) / 2;
      const spacing = 10;
      let photoX = 20;
      let maxRowHeight = 0;

      for (const photo of room.photos) {
        try {
          const props = doc.getImageProperties(photo);
          const h = (props.height / props.width) * photoWidth;

          if (currentY + h > 275) {
            doc.addPage();
            currentY = 20;
            photoX = 20;
          }

          doc.addImage(photo, 'JPEG', photoX, currentY, photoWidth, h);
          maxRowHeight = Math.max(maxRowHeight, h);
          
          if (photoX > 20) {
            currentY += maxRowHeight + spacing;
            photoX = 20;
            maxRowHeight = 0;
          } else {
            photoX += photoWidth + spacing;
          }
        } catch (e) {
          console.error('Error adding room image to PDF:', e);
        }
      }
      if (photoX > 20) {
        currentY += maxRowHeight + spacing;
      }
      currentY += 5;
    }

    // Skip items table and item photos for "Chaves" room OR if room has no items
    if (room.name.toLowerCase() !== 'chaves' && room.items && room.items.length > 0) {
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
        headStyles: { fillColor: [0, 58, 90], textColor: 'white', fontSize: 11 },
        bodyStyles: { fontSize: 11 },
        margin: { left: 20, right: 20 },
        didDrawPage: (data: any) => {
          currentY = data.cursor.y + 10;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Photos for each item in this room
      for (const item of room.items) {
        if (item.photos && item.photos.length > 0) {
          // Smart break for item: Title + at least one photo row
          if (currentY > 220) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 58, 90);
          const itemTitle = `Fotos - ${room.name} - ${item.name}${item.hasFurniture ? ' - Com Avaria' : ''}`;
          doc.text(itemTitle, 20, currentY);
          currentY += 7;

          // Observations (Description)
          doc.setFontSize(11); // Increased font size
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          const obsText = item.description || 'Sem observações';
          const splitObs = doc.splitTextToSize(`Observações: ${obsText}`, pageWidth - 40);
          doc.text(splitObs, 20, currentY);
          currentY += (splitObs.length * 5) + 2;

          // Damage Description
          if (item.hasFurniture && item.furnitureDescription) {
            doc.setFontSize(11); // Increased font size
            doc.setFont('helvetica', 'normal'); // Removed italics
            doc.setTextColor(150, 0, 0); // Red for damage description
            const splitAvaria = doc.splitTextToSize(`Descrição da Avaria: ${item.furnitureDescription}`, pageWidth - 40);
            doc.text(splitAvaria, 20, currentY);
            currentY += (splitAvaria.length * 5) + 5;
            doc.setTextColor(0, 58, 90); // Reset color
          } else {
            currentY += 5;
          }

          const photoWidth = (pageWidth - 50) / 2;
          const spacing = 10;
          let photoX = 20;
          let maxRowHeight = 0;

          for (const photo of item.photos) {
            try {
              const props = doc.getImageProperties(photo);
              const h = (props.height / props.width) * photoWidth;

              if (currentY + h > 275) {
                doc.addPage();
                currentY = 20;
                photoX = 20;
              }

              doc.addImage(photo, 'JPEG', photoX, currentY, photoWidth, h);
              maxRowHeight = Math.max(maxRowHeight, h);
              
              if (photoX > 20) {
                currentY += maxRowHeight + spacing;
                photoX = 20;
                maxRowHeight = 0;
              } else {
                photoX += photoWidth + spacing;
              }
            } catch (e) {
              console.error('Error adding item image to PDF:', e);
            }
          }
          if (photoX > 20) {
            currentY += maxRowHeight + spacing;
          }
          currentY += 10;
        }
      }
    } else {
      // For "Chaves" room, just add a bit of spacing if there were photos
      if (room.photos && room.photos.length > 0) {
        currentY += 5;
      }
    }
  }

  // Inspector Opinion Section
  if (data.inspectorOpinion) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    } else {
      currentY += 15;
    }
    
    drawSectionHeader('PARECER DO VISTORIADOR', currentY);
    currentY += 8;
    
    doc.setFontSize(11); // Increased font size
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const splitOpinion = doc.splitTextToSize(data.inspectorOpinion, pageWidth - 50);
    doc.text(splitOpinion, 25, currentY);
    currentY += (splitOpinion.length * 5) + 15;
  }

  // Signatures Section
  if (currentY > 200) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY += 20;
  }

  drawSectionHeader('TERMO DE ENCERRAMENTO E ASSINATURAS', currentY);
  currentY += 15;

  doc.setFontSize(11); // Increased font size
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const closureText = "As partes acima identificadas declaram estar de acordo com o estado de conservação do imóvel descrito neste laudo de vistoria, ratificando todas as informações e fotos aqui constantes.";
  const splitClosure = doc.splitTextToSize(closureText, pageWidth - 50);
  doc.text(splitClosure, 25, currentY);
  currentY += (splitClosure.length * 5) + 10;

  const contestText = "As partes possuem 5 dias úteis contando a partir do dia de emissão do laudo para contestar os itens desta vistoria.";
  const splitContest = doc.splitTextToSize(contestText, pageWidth - 50);
  doc.text(splitContest, 25, currentY);
  currentY += (splitContest.length * 5) + 25;

  const sigWidth = 65;
  const sigSpacing = 20;
  const totalWidth = (sigWidth * 2) + sigSpacing;
  const startX = (pageWidth - totalWidth) / 2;

  doc.setFontSize(10); // Increased font size for signature labels and names
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
