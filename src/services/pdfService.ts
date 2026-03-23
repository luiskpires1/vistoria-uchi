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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  // Spacing constants
  const LINE_HEIGHT = 6;
  const SECTION_GAP = 20;
  const HEADER_HEIGHT = 35;
  const FOOTER_SPACE = 25;
  const MAX_Y = pageHeight - FOOTER_SPACE;

  // Helper for page breaks
  const checkPageBreak = (neededHeight: number, currentY: number) => {
    if (currentY + neededHeight > MAX_Y) {
      doc.addPage();
      return margin + 5; // Return new Y
    }
    return currentY;
  };

  // Company Header Background
  doc.setFillColor(0, 58, 90);
  doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');

  // Company Header
  const logoUrl = '/logo.png';
  try {
    doc.addImage(logoUrl, 'PNG', 10, 2.5, 30, 30);
  } catch (e) {
    console.warn('Could not load logo for PDF, skipping...', e);
  }

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Uchi Imóveis', 45, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('CNPJ 63.595.950/0001-26 | CRECI 28561', 45, 19);
  doc.text('E-mail: contato@uchiimoveis.com', 45, 24);
  doc.text('Endereço: Rua Alcides Gonzaga 240, Boa Vista, Porto Alegre - RS, 90480-020', 45, 29);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(0, 58, 90);
  doc.setFont('helvetica', 'bold');
  doc.text('LAUDO DE VISTORIA IMOBILIÁRIA', pageWidth / 2, 48, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 55, { align: 'center' });

  // Helper for section headers
  const drawSectionHeader = (title: string, y: number) => {
    const headerHeight = 10;
    const newY = checkPageBreak(headerHeight + 10, y);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, newY - 8, contentWidth, headerHeight, 'F');
    doc.setFontSize(11);
    doc.setTextColor(0, 58, 90);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 5, newY - 1);
    return newY + 10;
  };

  // Property Info
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, 62, pageWidth - margin, 62);
  
  let currentY = 85;
  currentY = drawSectionHeader('DADOS DO IMÓVEL', currentY);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Endereço: ${data.property.address}${data.property.complement ? ', ' + data.property.complement : ''}`, margin + 5, currentY);
  currentY += LINE_HEIGHT;
  doc.text(`Bairro: ${data.property.neighborhood}`, margin + 5, currentY);
  currentY += LINE_HEIGHT;
  doc.text(`Cidade: ${data.property.city} - CEP: ${data.property.cep}`, margin + 5, currentY);
  currentY += SECTION_GAP;

  // Inspection Info
  currentY = drawSectionHeader('DADOS DA VISTORIA', currentY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`Tipo: ${data.type.toUpperCase()}`, margin + 5, currentY);
  currentY += LINE_HEIGHT;
  doc.text(`Data: ${new Date(data.date).toLocaleDateString('pt-BR')}`, margin + 5, currentY);
  currentY += LINE_HEIGHT;
  doc.text(`Status: ${data.status === 'completed' ? 'FINALIZADA' : 'EM RASCUNHO'}`, margin + 5, currentY);
  currentY += SECTION_GAP;

  // Parties Info
  currentY = drawSectionHeader('PARTES ENVOLVIDAS', currentY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  doc.text(`Vistoriador: ${data.inspector.name} (CPF: ${data.inspector.cpf})`, margin + 5, currentY);
  currentY += LINE_HEIGHT;

  if (data.type === 'venda') {
    if (data.seller) {
      doc.text(`Vendedor: ${data.seller.name} (CPF: ${data.seller.cpf})`, margin + 5, currentY);
      currentY += LINE_HEIGHT;
    }
    if (data.buyer) {
      doc.text(`Comprador: ${data.buyer.name} (CPF: ${data.buyer.cpf})`, margin + 5, currentY);
      currentY += LINE_HEIGHT;
    }
  } else {
    if (data.owner) {
      doc.text(`Proprietário: ${data.owner.name} (CPF: ${data.owner.cpf})`, margin + 5, currentY);
      currentY += LINE_HEIGHT;
    }
    if (data.tenant) {
      doc.text(`Inquilino: ${data.tenant.name} (CPF: ${data.tenant.cpf})`, margin + 5, currentY);
      currentY += LINE_HEIGHT;
    }
  }
  currentY += SECTION_GAP - LINE_HEIGHT;

  // Evaluation Criteria Section
  currentY = drawSectionHeader('CRITÉRIOS DE AVALIAÇÃO DO ESTADO DE CONSERVAÇÃO', currentY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('Novo: Primeiro uso.', margin + 5, currentY);
  doc.text('Bom: Sem grandes sinais de desgastes ou com pequenas irregularidades.', margin + 5, currentY + 5);
  doc.text('Regular: Com avarias.', margin + 5, currentY + 10);
  doc.text('Ruim: Com danos graves/relevantes.', margin + 5, currentY + 15);
  currentY += 25 + SECTION_GAP;

  // Property Description Section
  if (data.propertyDescription) {
    currentY = drawSectionHeader('DESCRIÇÃO DO IMÓVEL', currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    const splitPropDesc = doc.splitTextToSize(data.propertyDescription, contentWidth - 10);
    doc.text(splitPropDesc, margin + 5, currentY);
    currentY += (splitPropDesc.length * 5) + SECTION_GAP;
  }

  // Resumo de Avarias Section
  const itemsWithDamages: { room: string; item: string; description: string }[] = [];
  for (const room of data.rooms) {
    for (const item of room.items) {
      if (item.hasFurniture) {
        itemsWithDamages.push({
          room: room.name,
          item: item.name,
          description: item.furnitureDescription || 'Avaria registrada sem descrição específica.'
        });
      }
    }
  }

  if (itemsWithDamages.length > 0) {
    currentY = drawSectionHeader('RESUMO DE AVARIAS', currentY);
    const damageTableData = itemsWithDamages.map(d => [
      d.room,
      d.item,
      d.description
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Ambiente', 'Item', 'Descrição da Avaria']],
      body: damageTableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 58, 90], textColor: 'white', fontSize: 11 },
      bodyStyles: { fontSize: 11, textColor: [180, 0, 0] }, // Red text for damages
      margin: { left: margin, right: margin },
      didDrawPage: (data: any) => {
        currentY = data.cursor.y + 10;
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + SECTION_GAP;
  }

  // Rooms and Items
  for (const room of data.rooms) {
    // Smart page break for room
    let minRoomHeight = 25;
    if (room.description) minRoomHeight += 15;
    if (room.photos && room.photos.length > 0) minRoomHeight += 60;
    else if (room.items && room.items.length > 0) minRoomHeight += 40;

    currentY = checkPageBreak(minRoomHeight, currentY);

    doc.setDrawColor(0, 58, 90);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 58, 90);
    doc.text(room.name.toUpperCase(), margin, currentY);
    currentY += 8;

    if (room.description) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const splitDesc = doc.splitTextToSize(`Observação: ${room.description}`, contentWidth);
      doc.text(splitDesc, margin, currentY);
      currentY += (splitDesc.length * 5) + 5;
    } else {
      currentY += 2;
    }

    // Room Photos
    if (room.photos && room.photos.length > 0) {
      currentY = checkPageBreak(30, currentY);
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Fotos do Ambiente - ${room.name}`, margin, currentY);
      currentY += 10;

      const photoWidth = (contentWidth - 10) / 2;
      const spacing = 10;
      let photoX = margin;
      let maxRowHeight = 0;

      for (const photo of room.photos) {
        try {
          if (!photo) continue;
          
          // Force landscape aspect ratio (4:3)
          const targetAspectRatio = 4 / 3;
          const h = photoWidth / targetAspectRatio;

          const oldY = currentY;
          currentY = checkPageBreak(h + 10, currentY);
          if (currentY < oldY) {
            // New page was added
            photoX = margin;
          }

          // Detect format from data URI
          let format = 'JPEG';
          if (photo.startsWith('data:image/png')) format = 'PNG';
          else if (photo.startsWith('data:image/webp')) format = 'WEBP';
          else if (photo.startsWith('data:image/gif')) format = 'GIF';

          doc.addImage(photo, format, photoX, currentY, photoWidth, h, undefined, 'FAST');
          maxRowHeight = Math.max(maxRowHeight, h);
          
          if (photoX > margin) {
            currentY += maxRowHeight + spacing;
            photoX = margin;
            maxRowHeight = 0;
          } else {
            photoX += photoWidth + spacing;
          }
        } catch (e) {
          console.error(`Error adding room image (${room.name}) to PDF:`, e);
          // Add a placeholder or text indicating image error
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('[Erro ao carregar imagem]', photoX + 5, currentY + 10);
          
          if (photoX > margin) {
            currentY += 20 + spacing;
            photoX = margin;
          } else {
            photoX += photoWidth + spacing;
          }
        }
      }
      if (photoX > margin) {
        currentY += maxRowHeight + spacing;
      }
      currentY += 5;
    }

    // Items
    if (room.name.toLowerCase() !== 'chaves' && room.items && room.items.length > 0) {
      const tableData = room.items.map(item => [
        item.name,
        item.condition.toUpperCase(),
        item.description || '',
        item.hasFurniture ? (item.furnitureDescription || 'Sim') : 'Não'
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Item', 'Estado', 'Observações', 'Avaria?']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 58, 90], textColor: 'white', fontSize: 11 },
        bodyStyles: { fontSize: 11 },
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => {
          currentY = data.cursor.y + 10;
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Item Photos
      for (const item of room.items) {
        if (item.photos && item.photos.length > 0) {
          currentY = checkPageBreak(40, currentY);
          
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 58, 90);
          const itemTitle = `Fotos - ${room.name} - ${item.name}${item.hasFurniture ? ' - Com Avaria' : ''}`;
          doc.text(itemTitle, margin, currentY);
          currentY += 7;

          if (item.description) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 80);
            const splitObs = doc.splitTextToSize(`Observações: ${item.description}`, contentWidth);
            doc.text(splitObs, margin, currentY);
            currentY += (splitObs.length * 5) + 2;
          } else {
            currentY += 2;
          }

          if (item.hasFurniture && item.furnitureDescription) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150, 0, 0);
            const splitAvaria = doc.splitTextToSize(`Descrição da Avaria: ${item.furnitureDescription}`, contentWidth);
            doc.text(splitAvaria, margin, currentY);
            currentY += (splitAvaria.length * 5) + 5;
            doc.setTextColor(0, 58, 90);
          } else {
            currentY += 5;
          }

          const photoWidth = (contentWidth - 10) / 2;
          const spacing = 10;
          let photoX = margin;
          let maxRowHeight = 0;

          for (const photo of item.photos) {
            try {
              if (!photo) continue;

              // Force landscape aspect ratio (4:3)
              const targetAspectRatio = 4 / 3;
              const h = photoWidth / targetAspectRatio;

              const oldY = currentY;
              currentY = checkPageBreak(h + 10, currentY);
              if (currentY < oldY) {
                // New page was added
                photoX = margin;
              }

              // Detect format from data URI
              let format = 'JPEG';
              if (photo.startsWith('data:image/png')) format = 'PNG';
              else if (photo.startsWith('data:image/webp')) format = 'WEBP';
              else if (photo.startsWith('data:image/gif')) format = 'GIF';

              doc.addImage(photo, format, photoX, currentY, photoWidth, h, undefined, 'FAST');
              maxRowHeight = Math.max(maxRowHeight, h);
              
              if (photoX > margin) {
                currentY += maxRowHeight + spacing;
                photoX = margin;
                maxRowHeight = 0;
              } else {
                photoX += photoWidth + spacing;
              }
            } catch (e) {
              console.error(`Error adding item image (${room.name} - ${item.name}) to PDF:`, e);
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text('[Erro ao carregar imagem]', photoX + 5, currentY + 10);

              if (photoX > margin) {
                currentY += 20 + spacing;
                photoX = margin;
              } else {
                photoX += photoWidth + spacing;
              }
            }
          }
          if (photoX > margin) {
            currentY += maxRowHeight + spacing;
          }
          currentY += 10;
        }
      }
    }
  }

  // Inspector Opinion
  if (data.inspectorOpinion) {
    currentY = drawSectionHeader('PARECER DO VISTORIADOR', currentY);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const splitOpinion = doc.splitTextToSize(data.inspectorOpinion, contentWidth - 10);
    doc.text(splitOpinion, margin + 5, currentY);
    currentY += (splitOpinion.length * 5) + SECTION_GAP;
  }

  // Signatures
  // Ensure title and all signatures are on the same page if possible
  // Estimating height: title(20) + closure(20) + contest(15) + date(20) + signatures(80) = ~155
  currentY = checkPageBreak(160, currentY);
  currentY = drawSectionHeader('TERMO DE ENCERRAMENTO E ASSINATURAS', currentY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const closureText = "As partes acima identificadas declaram estar de acordo com o estado de conservação do imóvel descrito neste laudo de vistoria, ratificando todas as informações e fotos aqui constantes.";
  const splitClosure = doc.splitTextToSize(closureText, contentWidth - 10);
  doc.text(splitClosure, margin + 5, currentY);
  currentY += (splitClosure.length * 5) + 10;

  const contestText = "O prazo de contestação é de 5 dias úteis, contando a partir da data de emissão deste laudo.";
  const splitContest = doc.splitTextToSize(contestText, contentWidth - 10);
  doc.text(splitContest, margin + 5, currentY);
  currentY += (splitContest.length * 5) + 15;

  const formattedDate = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const locationDateText = `${data.property.city}, ${formattedDate}.`;
  doc.setFont('helvetica', 'bold');
  doc.text(locationDateText, pageWidth / 2, currentY, { align: 'center' });
  currentY += 30;

  const sigWidth = 65;
  const sigSpacing = 20;
  const totalWidth = (sigWidth * 2) + sigSpacing;
  const startX = (pageWidth - totalWidth) / 2;

  const signers: { label: string; person: Person }[] = [];
  if (data.type === 'venda') {
    if (data.seller?.name) signers.push({ label: 'Vendedor', person: data.seller });
    if (data.buyer?.name) signers.push({ label: 'Comprador', person: data.buyer });
  } else {
    if (data.owner?.name) signers.push({ label: 'Proprietário', person: data.owner });
    if (data.tenant?.name) signers.push({ label: 'Inquilino', person: data.tenant });
  }
  signers.push({ label: 'Vistoriador', person: data.inspector });

  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    const isEven = i % 2 === 0;
    
    let finalX = isEven ? startX : startX + sigWidth + sigSpacing;
    if (i === 2 && signers.length === 3) finalX = (pageWidth - sigWidth) / 2;

    doc.setDrawColor(150, 150, 150);
    doc.line(finalX, currentY, finalX + sigWidth, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(signer.label, finalX + sigWidth / 2, currentY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(signer.person.name, finalX + sigWidth / 2, currentY + 10, { align: 'center' });
    doc.text(`CPF: ${signer.person.cpf}`, finalX + sigWidth / 2, currentY + 14, { align: 'center' });

    if (!isEven || i === signers.length - 1) currentY += 35;
  }

  // Page Numbers and Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Uchi Imóveis', pageWidth / 2, pageHeight - 15, { align: 'center' });
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`laudo-vistoria-${data.property.address.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};
