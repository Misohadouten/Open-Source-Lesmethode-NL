using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using LessenHub.Domain.Entities;
using LessenHub.Domain.Enums;

namespace LessenHub.Backend.Services
{
    public class PdfGeneratorService
    {
        public byte[] GenerateLessenSeriePdf(LessenSerie lessenSerie)
        {
            using (var memoryStream = new MemoryStream())
            {
                var writer = new PdfWriter(memoryStream);
                var pdfDoc = new PdfDocument(writer);
                var document = new Document(pdfDoc);

                // First page - Overview
                document.Add(new Paragraph($"Lessenserie: {lessenSerie.Titel}")
                    .SetFontSize(20)
                    .SetBold()
                    .SetMarginBottom(20));

                // Algemene informatie section
                document.Add(new Paragraph("Algemene informatie")
                    .SetFontSize(14)
                    .SetBold()
                    .SetMarginBottom(10));

                document.Add(CreateGeneralInfoTable(lessenSerie));

                // Skills section
                if (lessenSerie.Vaardigheden != null && lessenSerie.Vaardigheden.Count > 0)
                {
                    document.Add(new Paragraph("Vaardigheden")
                        .SetFontSize(14)
                        .SetBold()
                        .SetMarginTop(20)
                        .SetMarginBottom(10));

                    foreach (var vaardigheid in lessenSerie.Vaardigheden)
                    {
                        document.Add(new Paragraph(vaardigheid.ToString())
                            .SetMarginLeft(20));
                    }
                }

                // Literature section
                if (lessenSerie.Literatuurlijst != null && lessenSerie.Literatuurlijst.Count > 0)
                {
                    document.Add(new Paragraph("Literatuur")
                        .SetFontSize(14)
                        .SetBold()
                        .SetMarginTop(20)
                        .SetMarginBottom(10));

                    foreach (var boek in lessenSerie.Literatuurlijst)
                    {
                        document.Add(new Paragraph(boek)
                            .SetMarginLeft(20));
                    }
                }

                // Lessons - on the same or new pages as they fit
                if (lessenSerie.Lessen != null && lessenSerie.Lessen.Count > 0)
                {
                    document.Add(new AreaBreak());

                    for (int i = 0; i < lessenSerie.Lessen.Count; i++)
                    {
                        document.Add(CreateLesPage(lessenSerie.Lessen[i], i + 1));
                    }
                }

                document.Close();
                return memoryStream.ToArray();
            }
        }

        public byte[] GenerateLesPdf(Les les, LessenSerie? lessenSerie = null, int? lessonNumber = null)
        {
            using (var memoryStream = new MemoryStream())
            {
                var writer = new PdfWriter(memoryStream);
                var pdfDoc = new PdfDocument(writer);
                var document = new Document(pdfDoc);

                var titlePrefix = lessonNumber.HasValue ? $"Les {lessonNumber.Value}: " : string.Empty;
                document.Add(new Paragraph($"{titlePrefix}{les.Titel}")
                    .SetFontSize(20)
                    .SetBold()
                    .SetMarginBottom(20));

                document.Add(new Paragraph("Lesinformatie")
                    .SetFontSize(14)
                    .SetBold()
                    .SetMarginBottom(10));

                var container = new Div();
                AddBulletItem(container, "Introductie", les.Introductie ?? "-");
                AddBulletItem(container, "Inhoud", les.Inhoud ?? "-");
                AddBulletItem(container, "Afsluiting", les.Slot ?? "-");
                AddBulletItem(container, "Tijdsduur", les.TijdsDuur.HasValue ? FormatTimeSpan(les.TijdsDuur.Value) : "-");

                if (les.Leerdoel != null && les.Leerdoel.Count > 0)
                {
                    var leerdoelenText = string.Join(", ", les.Leerdoel.Select(l => l.ToString()));
                    AddBulletItem(container, "Leerdoel", leerdoelenText);
                }

                if (lessenSerie != null)
                {
                    AddBulletItem(container, "Onderdeel van serie", lessenSerie.Titel);
                }

                document.Add(container);

                if (les.Literatuurlijst != null && les.Literatuurlijst.Count > 0)
                {
                    document.Add(new Paragraph("Literatuur")
                        .SetFontSize(14)
                        .SetBold()
                        .SetMarginTop(20)
                        .SetMarginBottom(10));

                    foreach (var boek in les.Literatuurlijst)
                    {
                        document.Add(new Paragraph(boek)
                            .SetMarginLeft(20));
                    }
                }

                document.Close();
                return memoryStream.ToArray();
            }
        }

        private Div CreateGeneralInfoTable(LessenSerie lessenSerie)
        {
            var container = new Div();

            AddBulletItem(container, "Omschrijving", lessenSerie.Omschrijving ?? "-");
            AddBulletItem(container, "Status", lessenSerie.Status.ToString());
            AddBulletItem(container, "Schoolniveau", lessenSerie.SchoolNiveau.ToString());
            AddBulletItem(container, "Taalniveau", lessenSerie.TaalNiveau.ToString());
            AddBulletItem(container, "Aantal lessen", lessenSerie.AantalLessen.ToString());
            AddBulletItem(container, "Duur per les", FormatTimeSpan(GetAverageLessonDuration(lessenSerie)));
            AddBulletItem(container, "Eigenaar", lessenSerie.Eigenaar?.Naam ?? "-");

            return container;
        }

        private void AddBulletItem(Div container, string label, string value)
        {
            container.Add(new Paragraph($"• {label}: {value}")
                .SetMarginLeft(20)
                .SetMarginBottom(5));
        }

        private Div CreateLesPage(Les les, int lessonNumber)
        {
            var container = new Div();
            container.SetMarginTop(20);
            container.SetMarginBottom(20);

            // Lesson title
            container.Add(new Paragraph($"Les {lessonNumber}")
                .SetFontSize(18)
                .SetBold()
                .SetMarginBottom(20));

            // Create bullet list for lesson details
            if (!string.IsNullOrEmpty(les.Introductie))
            {
                AddBulletItem(container, "Introductie", les.Introductie);
            }

            if (!string.IsNullOrEmpty(les.Inhoud))
            {
                AddBulletItem(container, "Inhoud", les.Inhoud);
            }

            if (!string.IsNullOrEmpty(les.Slot))
            {
                AddBulletItem(container, "Afsluiting", les.Slot);
            }

            if (les.TijdsDuur.HasValue)
            {
                AddBulletItem(container, "Tijdsduur", FormatTimeSpan(les.TijdsDuur.Value));
            }

            if (les.Leerdoel != null && les.Leerdoel.Count > 0)
            {
                var leerdoelenText = string.Join(", ", les.Leerdoel.Select(l => l.ToString()));
                AddBulletItem(container, "Leerdoel", leerdoelenText);
            }

            return container;
        }

        private TimeSpan GetAverageLessonDuration(LessenSerie lessenSerie)
        {
            if (lessenSerie.Lessen == null || lessenSerie.Lessen.Count == 0)
            {
                return lessenSerie.TijdsDuur;
            }

            var lessonsWithDuration = lessenSerie.Lessen.Where(l => l.TijdsDuur.HasValue).ToList();
            if (lessonsWithDuration.Count == 0)
            {
                return lessenSerie.TijdsDuur;
            }

            var totalTicks = lessonsWithDuration.Sum(l => l.TijdsDuur!.Value.Ticks);
            return new TimeSpan(totalTicks / lessonsWithDuration.Count);
        }

        private string FormatTimeSpan(TimeSpan timeSpan)
        {
            if (timeSpan.TotalHours >= 1)
            {
                var hours = (int)timeSpan.TotalHours;
                var minutes = timeSpan.Minutes;
                if (minutes > 0)
                {
                    return $"{hours} uur {minutes} minuten";
                }
                return $"{hours} uur";
            }
            return $"{timeSpan.Minutes} minuten";
        }
    }
}


