// Type-only guard: typecheck fails when an enum in src/shared/enums.ts no
// longer matches the generated Prisma enum of the same name.
import type * as Db from "@/server/db/generated/enums";
import type * as Shared from "@/shared/enums";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

type _EnumSync = [
  Assert<Equal<typeof Shared.CEFRLevel, typeof Db.CEFRLevel>>,
  Assert<Equal<typeof Shared.SourceType, typeof Db.SourceType>>,
  Assert<Equal<typeof Shared.VocabularyStatus, typeof Db.VocabularyStatus>>,
  Assert<Equal<typeof Shared.StudioArtifactType, typeof Db.StudioArtifactType>>,
  Assert<Equal<typeof Shared.ProcessingStatus, typeof Db.ProcessingStatus>>,
  Assert<Equal<typeof Shared.PartOfSpeech, typeof Db.PartOfSpeech>>,
];
