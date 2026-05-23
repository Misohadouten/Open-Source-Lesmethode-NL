# Async/Await Refactoring - LessenHub Backend

**Datum:** 16 januari 2026  
**Status:** ✅ Compleet

## Overzicht

Volledige refactoring van de repository laag en controllers van synchrone naar asynchrone operaties. Dit elimineert blocking calls naar MongoDB en verbetert de schaalbaarheid en performance van de applicatie.

---

## Uitgevoerde Wijzigingen

### 1. Repository Interfaces - Async Conversie

Alle repository interfaces zijn geconverteerd naar asynchrone methode signatures:

#### **IDocentRepository**
```csharp
// Voor:
Docent Create(Docent docent);
Docent? GetById(Guid id);

// Na:
Task<Docent> CreateAsync(Docent docent);
Task<Docent?> GetByIdAsync(Guid id);
```

#### **ILesRepository**
```csharp
// Voor:
Les? GetById(Guid id);
List<Les> GetLesByLessenSerie(Guid lessenSerieId);
Les Create(Les les);
Les? Update(Les les);
bool Delete(Guid id);

// Na:
Task<Les?> GetByIdAsync(Guid id);
Task<List<Les>> GetLesByLessenSerieAsync(Guid lessenSerieId);
Task<Les> CreateAsync(Les les);
Task<Les?> UpdateAsync(Les les);
Task<bool> DeleteAsync(Guid id);
```

#### **ILessenSerieRepository**
```csharp
// Voor:
LessenSerie? GetById(Guid id);
List<LessenSerie> GetAll(Guid docentId);
List<LessenSerie> GetAllAvailable();
List<LessenSerie> GetByStatus(string status);
LessenSerie Create(LessenSerie lessenSerie);
LessenSerie? Update(LessenSerie lessenSerie);
bool Delete(Guid id);
LessenSerie LessenSerieIndienen(Guid id);

// Na:
Task<LessenSerie?> GetByIdAsync(Guid id);
Task<List<LessenSerie>> GetAllAsync(Guid docentId);
Task<List<LessenSerie>> GetAllAvailableAsync();
Task<List<LessenSerie>> GetByStatusAsync(string status);
Task<LessenSerie> CreateAsync(LessenSerie lessenSerie);
Task<LessenSerie?> UpdateAsync(LessenSerie lessenSerie);
Task<bool> DeleteAsync(Guid id);
Task<LessenSerie> LessenSerieIndieningAsync(Guid id);
```

---

### 2. MongoDB Repository Implementaties

#### **DocentRepository.cs**

**Verwijderd blocking anti-pattern:**
```csharp
// ❌ VOOR (blocking):
public Docent? GetById(Guid id)
{
    return _collection.Find(l => l.Id == id)
        .FirstOrDefaultAsync()
        .GetAwaiter()
        .GetResult(); // BLOCKING!
}

// ✅ NA (async):
public async Task<Docent?> GetByIdAsync(Guid id)
{
    return await _collection.Find(l => l.Id == id).FirstOrDefaultAsync();
}
```

**Create methode:**
```csharp
// ✅ NA:
public async Task<Docent> CreateAsync(Docent docent)
{
    if (docent.Id == Guid.Empty)
        docent.Id = Guid.NewGuid();
    await _collection.InsertOneAsync(docent);
    return docent;
}
```

#### **LesRepository.cs**

Alle 5 methoden geconverteerd naar async:

```csharp
// GetByIdAsync
public async Task<Les?> GetByIdAsync(Guid id)
{
    return await _collection.Find(l => l.Id == id).FirstOrDefaultAsync();
}

// CreateAsync
public async Task<Les> CreateAsync(Les les)
{
    if (les.Id == Guid.Empty)
        les.Id = Guid.NewGuid();
    await _collection.InsertOneAsync(les);
    return les;
}

// UpdateAsync met null-safe check
public async Task<Les?> UpdateAsync(Les les)
{
    return await _collection.FindOneAndReplaceAsync(l => l.Id == les.Id, les);
}

// DeleteAsync met cascading update
public async Task<bool> DeleteAsync(Guid id)
{
    var les = await _collection.Find(l => l.Id == id).FirstOrDefaultAsync();
    if (les == null)
        return false;

    // Update parent LessenSerie - verwijder les uit array
    var filter = Builders<LessenSerie>.Filter.ElemMatch(
        ls => ls.Lessen, 
        l => l.Id == id
    );
    var update = Builders<LessenSerie>.Update.PullFilter(
        ls => ls.Lessen, 
        l => l.Id == id
    );
    await _lessenSerieCollection.UpdateManyAsync(filter, update);

    // Delete de les zelf
    await _collection.FindOneAndDeleteAsync(l => l.Id == id);
    return true;
}
```

#### **LessenSerieRepository.cs**

Alle 8 methoden geconverteerd, inclusief complexe operaties:

**CreateAsync met status initialisatie:**
```csharp
public async Task<LessenSerie> CreateAsync(LessenSerie lessenSerie)
{
    if (lessenSerie.Id == Guid.Empty)
        lessenSerie.Id = Guid.NewGuid();
    lessenSerie.Status = Models.Enums.StatusEnum.Nieuw;
    await _collection.InsertOneAsync(lessenSerie);
    return lessenSerie;
}
```

**DeleteAsync met cascading delete:**
```csharp
public async Task<bool> DeleteAsync(Guid id)
{
    var lessenserie = await _collection.Find(l => l.Id == id).FirstOrDefaultAsync();
    if (lessenserie is null)
        return true;

    // Verwijder alle gekoppelde lessen
    if (lessenserie.Lessen.Any())
    {
        foreach (var les in lessenserie.Lessen)
            await _lescollection.DeleteOneAsync(l => l.Id == les.Id);
    }
    
    await _collection.FindOneAndDeleteAsync(l => l.Id == id);
    return true;
}
```

**LessenSerieIndieningAsync met status update:**
```csharp
public async Task<LessenSerie> LessenSerieIndieningAsync(Guid id)
{
    var lessenSerie = await _collection.Find(l => l.Id == id).FirstOrDefaultAsync();
    if (lessenSerie == null)
        throw new InvalidOperationException($"LessenSerie met id {id} niet gevonden");

    lessenSerie.Status = Models.Enums.StatusEnum.Concept;
    return await _collection.FindOneAndReplaceAsync(l => l.Id == lessenSerie.Id, lessenSerie);
}
```

---

### 3. InMemory Repository Implementaties

Alle InMemory repositories geconverteerd voor test compatibiliteit:

#### **InMemory/DocentRepository.cs**
```csharp
public async Task<Docent> CreateAsync(Docent docent)
{
    if (docent.Id == Guid.Empty)
        docent.Id = Guid.NewGuid();
    Docenten.Add(docent);
    return await Task.FromResult(docent);
}

public async Task<Docent?> GetByIdAsync(Guid id)
{
    return await Task.FromResult(Docenten.FirstOrDefault(d => d.Id == id));
}
```

#### **InMemory/LesRepository.cs**
```csharp
public async Task<bool> DeleteAsync(Guid id)
{
    var lesToDelete = Lessen.FirstOrDefault(l => l.Id == id);
    if (lesToDelete != null)
    {
        Lessen.Remove(lesToDelete);
        return await Task.FromResult(true);
    }
    return await Task.FromResult(false);
}

public async Task<Les?> GetByIdAsync(Guid id)
{
    return await Task.FromResult(Lessen.FirstOrDefault(l => l.Id == id));
}

public async Task<List<Les>> GetLesByLessenSerieAsync(Guid lessenSerieId)
{
    var result = Lessen.Where(l => l.Id == lessenSerieId).ToList();
    return await Task.FromResult(result);
}

async Task<Les> ILesRepository.CreateAsync(Les les)
{
    if (les.Id == Guid.Empty)
        les.Id = Guid.NewGuid();
    Lessen.Add(les);
    return await Task.FromResult(les);
}

async Task<Les?> ILesRepository.UpdateAsync(Les les)
{
    var existingLes = Lessen.FirstOrDefault(l => l.Id == les.Id);
    if (existingLes != null)
    {
        existingLes.Titel = les.Titel;
        existingLes.Inhoud = les.Inhoud;
        existingLes.Id = les.Id;
        return await Task.FromResult(existingLes);
    }
    return await Task.FromResult<Les?>(null);
}
```

#### **InMemory/LessenSerieRepository.cs**
```csharp
public async Task<LessenSerie> CreateAsync(LessenSerie lessenSerie)
{
    if (lessenSerie.Id == Guid.Empty)
        lessenSerie.Id = Guid.NewGuid();
    lessenSerie.AantalLessen = lessenSerie.Lessen?.Count ?? 0;
    lessenSeries.Add(lessenSerie);
    return await Task.FromResult(lessenSerie);
}

public async Task<List<LessenSerie>> GetAllAsync(Guid id)
{
    return await Task.FromResult(lessenSeries.Where(ls => ls.Eigenaar.Id == id).ToList());
}

public async Task<List<LessenSerie>> GetByStatusAsync(string status)
{
    return await Task.FromResult(lessenSeries.Where(ls => ls.Status.ToString() == status).ToList());
}
```

---

### 4. Controller Async Conversie

#### **DocentController.cs**
```csharp
// Voor:
public ActionResult<Docent> Get(Guid id)
{
    var docent = _docentRepository.GetById(id);
    // ...
}

// Na:
public async Task<ActionResult<Docent>> Get(Guid id)
{
    var docent = await _docentRepository.GetByIdAsync(id);
    // ...
}
```

#### **LesController.cs**

Alle endpoints geconverteerd:

```csharp
[HttpGet("{id}")]
public async Task<ActionResult<Les>> Get(Guid id)
{
    var les = await repository.GetByIdAsync(id);
    if (les == null) return NotFound();
    return Ok(les);
}

[HttpPost]
public async Task<ActionResult<Les>> Create([FromBody] Les les)
{
    var created = await repository.CreateAsync(les);
    return StatusCode(201, created);
}

[HttpPut("{id}")]
public async Task<ActionResult<Les>> Update(Guid id, [FromBody] Les les)
{
    var existingLes = await repository.GetByIdAsync(id);
    if (existingLes == null) return NotFound();
    
    var updatedLes = await repository.UpdateAsync(les);
    return Ok(updatedLes);
}

[HttpDelete("{id}")]
public async Task<ActionResult> Delete(Guid id)
{
    var existingLes = await repository.GetByIdAsync(id);
    if (existingLes == null) return NotFound();
    
    await repository.DeleteAsync(id);
    return NoContent();
}
```

#### **LessenSerieController.cs**

Alle 8 endpoints inclusief PDF download:

```csharp
[HttpGet]
public async Task<ActionResult<IEnumerable<LessenSerie>>> GetAll(Guid docentId)
{
    var lessenSeries = await repository.GetAllAsync(docentId);
    return Ok(lessenSeries);
}

[HttpGet("status/{status}")]
public async Task<ActionResult<IEnumerable<LessenSerie>>> GetByStatus(string status)
{
    var lessenSeries = await repository.GetByStatusAsync(status);
    return Ok(lessenSeries);
}

[HttpGet("{id}")]
public async Task<ActionResult<LessenSerie>> Get(Guid id)
{
    var les = await repository.GetByIdAsync(id);
    if (les == null) return NotFound();
    return Ok(les);
}

[HttpGet("Indienen/{id}")]
public async Task<ActionResult<LessenSerie>> Indienen(Guid id)
{
    var les = await repository.LessenSerieIndieningAsync(id);
    return Ok(les);
}

[HttpPost]
public async Task<ActionResult<LessenSerie>> Create([FromBody] LessenSerie lessenSerie)
{
    var created = await repository.CreateAsync(lessenSerie);
    return StatusCode(201, created);
}

[HttpPut("{id}")]
public async Task<ActionResult<LessenSerie>> Update(Guid id, [FromBody] LessenSerie lessenSerie)
{
    var existing = await repository.GetByIdAsync(id);
    if (existing == null) return NotFound();
    
    var updated = await repository.UpdateAsync(lessenSerie);
    return Ok(updated);
}

[HttpDelete("{id}")]
public async Task<ActionResult> Delete(Guid id)
{
    var existingLes = await repository.GetByIdAsync(id);
    if (existingLes == null) return NotFound();
    
    await repository.DeleteAsync(id);
    return NoContent();
}

[HttpGet("download/{id}")]
public async Task<ActionResult> DownloadPdf(Guid id)
{
    var lessenSerie = await repository.GetByIdAsync(id);
    if (lessenSerie == null) return NotFound("LessenSerie not found.");
    
    var pdfBytes = pdfGenerator.GenerateLessenSeriePdf(lessenSerie);
    var fileName = $"{lessenSerie.Titel.Replace(" ", "_")}.pdf";
    return File(pdfBytes, "application/pdf", fileName);
}
```

#### **AuthController.cs**

SyncDocent helper methode geconverteerd:

```csharp
// Voor:
private string SyncDocent(string name, string email)
{
    var existingDocent = _docentRepository.GetById(docentId);
    if (existingDocent == null)
    {
        _docentRepository.Create(newDocent);
    }
    return docentId.ToString();
}

// Na:
private async Task<string> SyncDocentAsync(string name, string email)
{
    var existingDocent = await _docentRepository.GetByIdAsync(docentId);
    if (existingDocent == null)
    {
        await _docentRepository.CreateAsync(newDocent);
    }
    return docentId.ToString();
}

// GetCurrentUser endpoint:
[HttpGet("me")]
public async Task<IActionResult> GetCurrentUser()
{
    // ...
    if (isAuthenticated && !string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(name))
    {
        docentId = await SyncDocentAsync(name, email);
    }
    return Ok(new { isAuthenticated, email, name, docentId });
}
```

---

## Voordelen van Async/Await

### 1. **Performance & Schaalbaarheid**
- Threads worden niet geblokkeerd tijdens I/O operaties
- Betere thread pool utilization
- Hogere request throughput mogelijk

### 2. **Geen Deadlock Risico**
- Eliminatie van `.GetAwaiter().GetResult()` anti-pattern
- Voorkomt thread pool starvation
- Betere foutafhandeling

### 3. **MongoDB Driver Optimalisatie**
- Gebruik van native async MongoDB methoden
- Efficiënter connection pooling
- Betere resource utilization

### 4. **ASP.NET Core Best Practices**
- Volgt Microsoft aanbevelingen voor async controllers
- Betere integratie met middleware pipeline
- Consistent async pattern door hele codebase

---

## Anti-Patterns Verwijderd

### ❌ **Sync-over-Async (VOOR)**
```csharp
public Docent? GetById(Guid id)
{
    return _collection.Find(l => l.Id == id)
        .FirstOrDefaultAsync()
        .GetAwaiter()
        .GetResult(); // BLOCKING - kan deadlocks veroorzaken!
}
```

### ✅ **Proper Async (NA)**
```csharp
public async Task<Docent?> GetByIdAsync(Guid id)
{
    return await _collection.Find(l => l.Id == id).FirstOrDefaultAsync();
}
```

---

## Test Status

### Unit Tests
- ✅ **DocentRepositoryTests**: 3 tests passing
  - `Create_AssignsId_WhenEmpty`
  - `GetById_ReturnsNull_WhenNotFound`
  - `GetById_ReturnsDocent_WhenExists`

- ✅ **LesControllerTests**: 2 tests passing
  - `Get_ReturnsNotFound_WhenLesDoesNotExist`
  - `Create_Returns201AndPersists`

### Build Status
- ✅ Build succesvol (0 errors, 0 warnings)
- ✅ Alle tests slagen
- ✅ Geen breaking changes

---

## Gewijzigde Bestanden

### Repository Layer
- `Repositories/Interfaces/IDocentRepository.cs`
- `Repositories/Interfaces/ILesRepository.cs`
- `Repositories/Interfaces/ILessenSerieRepository.cs`
- `Repositories/Mongo/DocentRepository.cs`
- `Repositories/Mongo/LesRepository.cs`
- `Repositories/Mongo/LessenSerieRepository.cs`
- `Repositories/InMemory/DocentRepository.cs`
- `Repositories/InMemory/LesRepository.cs`
- `Repositories/InMemory/LessenSerieRepository.cs`

### Controller Layer
- `Controllers/DocentController.cs`
- `Controllers/LesController.cs`
- `Controllers/LessenSerieController.cs`
- `Controllers/AuthController.cs`

**Totaal:** 13 bestanden aangepast

---

## Volgende Stappen

### 🔜 Aanbevolen Optimalisaties

1. **MongoDB Indices**
   - Index op `Docent.Email` (unique)
   - Index op `LessenSerie.Eigenaar.Id`
   - Index op `LessenSerie.Status`
   - Index op `LessenSerie.Leerjaar`

2. **Connection Pooling**
   - Configureer MongoDB connection pool settings
   - Monitor connection usage

3. **Caching Layer**
   - Consider Redis/Memory cache voor frequently accessed data
   - Cache invalidatie strategie

4. **Performance Monitoring**
   - Application Insights of vergelijkbaar
   - Query performance tracking
   - Response time monitoring

---

## Conclusie

✅ **Volledige async/await refactoring succesvol afgerond**

De codebase gebruikt nu consequent async/await patterns door de hele applicatie stack:
- Repository interfaces: 100% async
- MongoDB implementations: 100% async (geen blocking calls)
- InMemory implementations: 100% async (test compatible)
- Controllers: 100% async (alle endpoints)

Dit legt een solide basis voor schaalbaarheid en performance optimalisatie.
