import { cigar_string } from "./tubemap";

describe('cigar_string', () => {
    it('it can handle an edit that is a match and deletion', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 6,
                to_length: 4
              }
            ]
          }
        ]
      }
      expect(cigar_string(readPath)).toBe("4M2D");
    });

    it('it can handle an edit that is a match and insertion', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 4,
                to_length: 6
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("4M2I");
    });

    it('it can handle edit with double-digit length values', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 11,
                to_length: 11
              },
              {
                from_length: 21,
                to_length: 22,
                sequence: "AA"
              },
              {
                to_length: 13,
                sequence: "A"
              },
              {
                from_length: 12,
                to_length: 10
              },
              {
                from_length: 22
              }
            ]
          },
          {
            edit: [
              {
                from_length: 16
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("32M14I10M40D");
    });

    it('it can handle a mapping with multiple edits', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 8,
                to_length: 9
              }
            ]
          },
          {
            edit: [
              {
                from_length: 2,
                to_length: 1
              }
            ]
          },
          {
            edit: [
              {
                from_length: 4,
                to_length: 4
              }
            ]
          },
          {
            edit: [
              {
                from_length: 18,
                to_length: 11
              }
            ]
          },
          {
            edit: [
              {
                from_length: 15,
                sequence: "C"
              }
            ]
          },
          {
            edit: [
              {
                from_length: 3,
                to_length: 4,
                sequence: "G"
              }
            ]
          }, 
          {
            edit: [
              {
                from_length: 8,
                to_length: 9,
                sequence: "C"
              }
            ]
          }, 
          {
            edit: [
              {
                from_length: 10,
                to_length: 10,
                sequence: "ATCG"
              }
            ]
          },
          {
            edit: [
              {
                from_length: 15,
                to_length: 14,
                sequence: "G"
              }
            ]
          },
          {
            edit: [
              {
                to_length: 9,
                sequence: "AAAA"
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("8M1I1M1D15M22D3M1I8M1I24M1D9I");
    });

    it('it can handle multiple edits with lengths of 0', async () => {
      const readPath = {
        mapping: [
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                to_length: 0
              }
            ]
          },
          {
            edit: [
              {
                from_length: 0,
                sequence: "C"
              }
            ]
          }
        ]
      };
      expect(cigar_string(readPath)).toBe("0M");
    });
  });