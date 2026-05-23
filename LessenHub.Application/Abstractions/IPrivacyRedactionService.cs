namespace LessenHub.Application.Abstractions;

public interface IPrivacyRedactionService
{
    string RedactForAi(string text);
}
