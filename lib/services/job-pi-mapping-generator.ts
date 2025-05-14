import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { PIService } from "./pi.service";
import { MappingService } from "./pi-job-mapping.service";
import dJSON from "dirty-json";

export class JobPIMappingGenerator {
  private piService: PIService;
  private mappingService: MappingService;

  constructor() {
    this.piService = new PIService();
    this.mappingService = new MappingService();
  }

  async generateMappingsForJob(
    userId: string,
    job: any,
    businessDescription: string = "",
  ): Promise<boolean> {
    try {
      // Fetch all existing PIs to provide to the AI
      const pis = await this.piService.getAllPIs(userId);

      if (!pis || pis.length === 0) {
        console.log("No PIs found, skipping mapping generation");
        return false;
      }

      // Create a context string with job and PIs information for the AI
      const jobContext = `Job ID: ${job._id}, JobTitle: ${job.title}, Notes: ${job.notes}`;
      const pisContext = pis
        .map(
          (pi) =>
            `PI ID: ${pi._id}, PI Name: ${pi.name}, PI target value: ${pi.targetValue}, Notes: ${pi.notes},`,
        )
        .join("\n");

      // Create a custom prompt for mapping generation
      const mappingsPrompt =
        `Based on the following Job and Progress Indicators (PIs), create mappings between the job and PIs that make sense. ` +
        `\n\nJOB:\n${jobContext}\n\nPROGRESS INDICATORS:\n${pisContext}\n\n` +
        `Generate mappings between the job and existing PIs where the job must impact one or more PIs. ` +
        `For each mapping, you need to specify how much impact the job has on a specific PI using a piImpactValue. ` +
        `The piImpactValue should not exceed the targetValue for that PI. ` +
        `IMPORTANT: Ensure that the job is mapped to at least one existing PI, and only choose from existing PIs that are most relevant to the job. ` +
        `Output your result in the form of a JSON in the following format: ` +
        `{ "mapping1": { "jobId": "${job._id}", "jobName": "${job.title}", "piId": "pi-id-here", "piName": "PI Name Here", "piImpactValue": piImpactValue-here, "piTarget": pi-target-value-here, "notes": "Explanation of this mapping" } }. ` +
        `Your output should strictly follow this format with double quotes for all keys and string values, not single quotes. This should be the only output.`;

      // Create a system prompt (similar to onboarding)
      const systemPrompt =
        "You are an elite business strategy consultant with decades of experience across multiple industries, specializing in guiding startups and small businesses from ideation through scaling based on cross-industry best practices." +
        `You are advising a business owner ${businessDescription ? 'whose business mission statement is: "' + businessDescription + '".' : "."} `;

      // Use generateText to generate the mappings
      const { text } = await generateText({
        model: openai("gpt-4-turbo"),
        system: systemPrompt,
        prompt: mappingsPrompt,
      });

      // Process and save mappings
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Get the JSON string
        let jsonStr = jsonMatch[0];

        try {
          // Use dirty-json to parse the string
          const mappingsData = dJSON.parse(jsonStr);

          // Save each mapping
          for (const key in mappingsData) {
            const mapping = mappingsData[key];

            // Verify mapping has required fields
            if (
              !mapping.jobId ||
              !mapping.piId ||
              mapping.piImpactValue === undefined
            ) {
              console.warn("Mapping missing required fields:", mapping);
              continue;
            }

            // Create a new mapping
            await this.mappingService.CreateMapping(
              {
                jobId: mapping.jobId,
                jobName: mapping.jobName,
                piId: mapping.piId,
                piName: mapping.piName,
                piImpactValue: mapping.piImpactValue,
                piTarget: mapping.piTarget,
                notes:
                  `[Auto-generated mapping for job ${mapping.jobName}] ` +
                  mapping.notes,
              },
              userId,
            );
            console.log(
              `Mapping created: ${mapping.jobName} -> ${mapping.piName} with impact value ${mapping.piImpactValue}`,
            );
          }

          // Successfully created mappings
          return true;
        } catch (error) {
          console.error(
            "Error parsing Mappings JSON:",
            error,
            "Input string:",
            jsonStr,
          );
          return false;
        }
      } else {
        console.error("No JSON format found in AI response for Mappings");
        return false;
      }
    } catch (error) {
      console.error("Error generating mappings for job:", error);
      return false;
    }
  }
}
