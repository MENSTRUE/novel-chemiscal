import pubchempy as pcp
import pandas as pd
import numpy as np
from tqdm import tqdm
import time
import json
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# CONFIGURATION

CONFIG = {
    'output_dir': './data',
    'pubchem_limit_per_category': 50,  # Increased
    'chembl_limit': 500,
    'rate_limit_delay': 0.2,  # seconds between API calls
    'output_filename': 'unified_chemicals_raw.csv'
}

# PUBCHEM DOWNLOADER (FIXED)

class PubChemDownloader:
    
    def __init__(self):
        self.compounds = []
        self.seen_cids = set()
        
        # Expanded categories for petrochemical industry
        self.categories = [
            # === SOLVENTS ===
            "solvent", "organic solvent", "polar solvent", "nonpolar solvent",
            "protic solvent", "aprotic solvent",
            
            # === ALCOHOLS ===
            "methanol", "ethanol", "propanol", "isopropanol", "butanol",
            "isobutanol", "pentanol", "hexanol", "octanol", "benzyl alcohol",
            "ethylene glycol", "propylene glycol", "glycerol",
            
            # === KETONES ===
            "acetone", "butanone", "methyl ethyl ketone", "cyclohexanone",
            "acetophenone", "methyl isobutyl ketone",
            
            # === ALDEHYDES ===
            "formaldehyde", "acetaldehyde", "benzaldehyde", "propanal",
            
            # === HYDROCARBONS - ALKANES ===
            "methane", "ethane", "propane", "butane", "pentane",
            "hexane", "heptane", "octane", "nonane", "decane",
            "undecane", "dodecane", "cyclohexane", "methylcyclohexane",
            "isooctane", "neopentane",
            
            # === HYDROCARBONS - ALKENES ===
            "ethylene", "propylene", "butene", "isobutylene",
            "butadiene", "isoprene", "cyclohexene",
            
            # === HYDROCARBONS - ALKYNES ===
            "acetylene", "propyne",
            
            # === AROMATICS ===
            "benzene", "toluene", "xylene", "ethylbenzene", "styrene",
            "cumene", "naphthalene", "anthracene", "phenanthrene",
            "biphenyl", "mesitylene", "durene",
            
            # === PHENOLS ===
            "phenol", "cresol", "catechol", "hydroquinone", "resorcinol",
            "bisphenol A", "xylenol",
            
            # === CARBOXYLIC ACIDS ===
            "formic acid", "acetic acid", "propionic acid", "butyric acid",
            "valeric acid", "caproic acid", "benzoic acid", "adipic acid",
            "terephthalic acid", "phthalic acid", "maleic acid", "citric acid",
            "oxalic acid", "lactic acid", "acrylic acid",
            
            # === ESTERS ===
            "methyl acetate", "ethyl acetate", "butyl acetate", "vinyl acetate",
            "methyl methacrylate", "ethyl acrylate", "dioctyl phthalate",
            "dimethyl terephthalate",
            
            # === ETHERS ===
            "diethyl ether", "diisopropyl ether", "tetrahydrofuran", "dioxane",
            "methyl tert-butyl ether", "anisole", "diphenyl ether",
            "ethylene oxide", "propylene oxide",
            
            # === AMINES ===
            "methylamine", "ethylamine", "dimethylamine", "trimethylamine",
            "aniline", "ethanolamine", "diethanolamine", "triethanolamine",
            "ethylenediamine", "hexamethylenediamine",
            
            # === AMIDES ===
            "formamide", "dimethylformamide", "acetamide", "dimethylacetamide",
            "caprolactam", "urea",
            
            # === NITRILES ===
            "acetonitrile", "acrylonitrile", "benzonitrile", "adiponitrile",
            
            # === HALOGENATED ===
            "chloroform", "dichloromethane", "carbon tetrachloride",
            "chlorobenzene", "dichlorobenzene", "vinyl chloride",
            "trichloroethylene", "perchloroethylene", "freon",
            "chloroethane", "bromoethane",
            
            # === SULFUR COMPOUNDS ===
            "dimethyl sulfoxide", "dimethyl sulfide", "carbon disulfide",
            "thiophene", "mercaptan", "methanethiol",
            
            # === NITROGEN COMPOUNDS ===
            "ammonia", "hydrazine", "nitrobenzene", "nitromethane",
            "pyridine", "piperidine", "morpholine",
            
            # === INDUSTRIAL CHEMICALS ===
            "hydrogen peroxide", "sodium hydroxide", "sulfuric acid",
            "nitric acid", "hydrochloric acid", "phosphoric acid",
            "carbon monoxide", "carbon dioxide", "hydrogen sulfide",
            
            # === MONOMERS & POLYMERS ===
            "vinyl chloride", "vinylidene chloride", "tetrafluoroethylene",
            "acrylonitrile", "methyl methacrylate", "vinyl acetate",
        ]
    
    def download(self):
        """Download compounds from all categories"""
        print("\n" + "="*70)
        print(" DOWNLOADING FROM PUBCHEM")
        print("="*70)
        print(f"Categories to search: {len(self.categories)}")
        
        for category in tqdm(self.categories, desc="PubChem Progress"):
            self._search_category(category)
            time.sleep(CONFIG['rate_limit_delay'])
        
        print(f"\n PubChem download complete: {len(self.compounds)} compounds")
        return self.compounds
    
    def _search_category(self, category):
        """Search single category"""
        try:
            results = pcp.get_compounds(category, 'name', listkey_count=100)
            
            for compound in results[:CONFIG['pubchem_limit_per_category']]:
                if compound.cid not in self.seen_cids:
                    data = self._extract_data(compound, category)
                    if data:
                        self.compounds.append(data)
                        self.seen_cids.add(compound.cid)
                        
        except Exception as e:
            # Silent fail untuk category yang tidak ditemukan
            pass
    
    def _extract_data(self, compound, search_category):
        """Extract relevant data from compound - FIXED for deprecation"""
        try:
            # FIXED: Use 'smiles' instead of deprecated 'isomeric_smiles'
            smiles = getattr(compound, 'smiles', None) or getattr(compound, 'isomeric_smiles', None)
            
            # Skip jika tidak ada SMILES
            if not smiles:
                return None
            
            # Get name
            name = None
            if compound.iupac_name:
                name = compound.iupac_name
            elif compound.synonyms:
                name = compound.synonyms[0]
            else:
                name = f"CID-{compound.cid}"
            
            # FIXED: Use try-except for each property
            data = {
                'source': 'PubChem',
                'source_id': f"CID{compound.cid}",
                'name': name,
                'molecular_formula': self._safe_get(compound, 'molecular_formula'),
                'molecular_weight': self._safe_get(compound, 'molecular_weight'),
                'smiles': smiles,
                'canonical_smiles': self._safe_get(compound, 'canonical_smiles') or smiles,
                'inchi': self._safe_get(compound, 'inchi'),
                'inchikey': self._safe_get(compound, 'inchikey'),
                'iupac_name': self._safe_get(compound, 'iupac_name'),
                'synonyms': '|'.join(compound.synonyms[:10]) if compound.synonyms else '',
                'search_category': search_category,
                # Properties
                'xlogp': self._safe_get(compound, 'xlogp'),
                'exact_mass': self._safe_get(compound, 'exact_mass'),
                'monoisotopic_mass': self._safe_get(compound, 'monoisotopic_mass'),
                'tpsa': self._safe_get(compound, 'tpsa'),
                'complexity': self._safe_get(compound, 'complexity'),
                'charge': self._safe_get(compound, 'charge'),
                'h_bond_donor_count': self._safe_get(compound, 'h_bond_donor_count'),
                'h_bond_acceptor_count': self._safe_get(compound, 'h_bond_acceptor_count'),
                'rotatable_bond_count': self._safe_get(compound, 'rotatable_bond_count'),
                'heavy_atom_count': self._safe_get(compound, 'heavy_atom_count'),
                'atom_stereo_count': self._safe_get(compound, 'atom_stereo_count'),
                'defined_atom_stereo_count': self._safe_get(compound, 'defined_atom_stereo_count'),
                'undefined_atom_stereo_count': self._safe_get(compound, 'undefined_atom_stereo_count'),
                'bond_stereo_count': self._safe_get(compound, 'bond_stereo_count'),
                'covalent_unit_count': self._safe_get(compound, 'covalent_unit_count'),
            }
            
            return data
            
        except Exception as e:
            return None
    
    def _safe_get(self, compound, attr):
        """Safely get attribute from compound"""
        try:
            return getattr(compound, attr, None)
        except:
            return None


# CHEMBL DOWNLOADER

class ChEMBLDownloader:
    """Download bioactive molecules from ChEMBL database"""
    
    def __init__(self):
        self.compounds = []
        self.seen_chembl_ids = set()
    
    def download(self):
        """Download compounds from ChEMBL"""
        print("\n" + "="*70)
        print(" DOWNLOADING FROM ChEMBL")
        print("="*70)
        
        try:
            from chembl_webresource_client.new_client import new_client
            molecule = new_client.molecule
            
            # Query untuk berbagai tipe molekul
            queries = [
                # Drug-like molecules (Lipinski compliant)
                {
                    'molecule_properties__mw_freebase__lte': 500,
                    'molecule_properties__alogp__gte': -2,
                    'molecule_properties__alogp__lte': 5
                },
                # Small molecules
                {
                    'molecule_properties__mw_freebase__lte': 300,
                },
                # Molecules with aromatic rings
                {
                    'molecule_properties__aromatic_rings__gte': 1,
                    'molecule_properties__mw_freebase__lte': 400
                },
            ]
            
            for i, query in enumerate(tqdm(queries, desc="ChEMBL Queries")):
                try:
                    results = molecule.filter(**query).only([
                        'molecule_chembl_id',
                        'pref_name', 
                        'molecule_structures',
                        'molecule_properties'
                    ])[:200]
                    
                    for mol in results:
                        if mol.get('molecule_chembl_id') not in self.seen_chembl_ids:
                            data = self._extract_data(mol)
                            if data:
                                self.compounds.append(data)
                                self.seen_chembl_ids.add(mol.get('molecule_chembl_id'))
                    
                    time.sleep(1)  # ChEMBL rate limiting
                    
                except Exception as e:
                    print(f"   Query {i+1} error: {str(e)[:50]}")
                    continue
            
            print(f"\n ChEMBL download complete: {len(self.compounds)} compounds")
            
        except ImportError:
            print(" chembl_webresource_client not installed")
            print("   Run: pip install chembl_webresource_client")
        except Exception as e:
            print(f"ChEMBL error: {e}")
        
        return self.compounds
    
    def _extract_data(self, mol):
        """Extract data from ChEMBL molecule"""
        try:
            structures = mol.get('molecule_structures') or {}
            properties = mol.get('molecule_properties') or {}
            
            # Skip jika tidak ada SMILES
            smiles = structures.get('canonical_smiles')
            if not smiles:
                return None
            
            data = {
                'source': 'ChEMBL',
                'source_id': mol.get('molecule_chembl_id'),
                'name': mol.get('pref_name') or mol.get('molecule_chembl_id'),
                'molecular_formula': properties.get('full_molformula'),
                'molecular_weight': properties.get('full_mwt'),
                'smiles': smiles,
                'canonical_smiles': smiles,
                'inchi': structures.get('standard_inchi'),
                'inchikey': structures.get('standard_inchi_key'),
                'iupac_name': None,
                'synonyms': '',
                'search_category': 'bioactive',
                # Properties dari ChEMBL
                'xlogp': properties.get('alogp'),
                'exact_mass': None,
                'monoisotopic_mass': None,
                'tpsa': properties.get('psa'),
                'complexity': None,
                'charge': None,
                'h_bond_donor_count': properties.get('hbd'),
                'h_bond_acceptor_count': properties.get('hba'),
                'rotatable_bond_count': properties.get('rtb'),
                'heavy_atom_count': properties.get('heavy_atoms'),
                'atom_stereo_count': None,
                'defined_atom_stereo_count': None,
                'undefined_atom_stereo_count': None,
                'bond_stereo_count': None,
                'covalent_unit_count': None,
                # ChEMBL specific
                'aromatic_rings': properties.get('aromatic_rings'),
                'qed_weighted': properties.get('qed_weighted'),
                'mw_monoisotopic': properties.get('mw_monoisotopic'),
            }
            
            return data
            
        except Exception as e:
            return None


# ADDITIONAL DATA: COMMON INDUSTRIAL CHEMICALS BY CID

class IndustrialChemicalsDownloader:
    """Download specific industrial chemicals by their PubChem CID"""
    
    def __init__(self):
        self.compounds = []
        
        # List of important industrial chemical CIDs
        # Format: (CID, common_name, category)
        self.industrial_cids = [
            # Basic petrochemicals
            (297, "Methane", "alkane"),
            (6324, "Ethane", "alkane"),
            (6334, "Propane", "alkane"),
            (7843, "Butane", "alkane"),
            (8003, "Pentane", "alkane"),
            (8058, "Hexane", "alkane"),
            (8900, "Heptane", "alkane"),
            (356, "Octane", "alkane"),
            (8141, "Nonane", "alkane"),
            (15600, "Decane", "alkane"),
            
            # Alkenes
            (6325, "Ethylene", "alkene"),
            (8252, "Propylene", "alkene"),
            (7844, "1-Butene", "alkene"),
            (8255, "Isobutylene", "alkene"),
            (7845, "1,3-Butadiene", "diene"),
            
            # Aromatics
            (241, "Benzene", "aromatic"),
            (1140, "Toluene", "aromatic"),
            (7237, "o-Xylene", "aromatic"),
            (7809, "m-Xylene", "aromatic"),
            (7810, "p-Xylene", "aromatic"),
            (7501, "Ethylbenzene", "aromatic"),
            (7237, "Styrene", "aromatic"),
            (7005, "Naphthalene", "aromatic"),
            
            # Alcohols
            (887, "Methanol", "alcohol"),
            (702, "Ethanol", "alcohol"),
            (1031, "1-Propanol", "alcohol"),
            (3776, "Isopropanol", "alcohol"),
            (263, "1-Butanol", "alcohol"),
            (6568, "Isobutanol", "alcohol"),
            (174, "Ethylene glycol", "alcohol"),
            (1030, "Propylene glycol", "alcohol"),
            (753, "Glycerol", "alcohol"),
            
            # Ketones
            (180, "Acetone", "ketone"),
            (6569, "Methyl ethyl ketone", "ketone"),
            (7967, "Cyclohexanone", "ketone"),
            
            # Aldehydes
            (712, "Formaldehyde", "aldehyde"),
            (177, "Acetaldehyde", "aldehyde"),
            
            # Acids
            (284, "Formic acid", "acid"),
            (176, "Acetic acid", "acid"),
            (1032, "Propionic acid", "acid"),
            (243, "Benzoic acid", "acid"),
            (196, "Citric acid", "acid"),
            (971, "Oxalic acid", "acid"),
            (6581, "Adipic acid", "acid"),
            (7489, "Terephthalic acid", "acid"),
            
            # Esters
            (6584, "Methyl acetate", "ester"),
            (8857, "Ethyl acetate", "ester"),
            (31272, "Butyl acetate", "ester"),
            (7966, "Vinyl acetate", "ester"),
            
            # Ethers
            (3283, "Diethyl ether", "ether"),
            (8028, "Tetrahydrofuran", "ether"),
            (31275, "1,4-Dioxane", "ether"),
            (15413, "MTBE", "ether"),
            
            # Halogenated
            (6344, "Chloroform", "halogenated"),
            (6344, "Dichloromethane", "halogenated"),
            (5943, "Carbon tetrachloride", "halogenated"),
            (7964, "Chlorobenzene", "halogenated"),
            (6366, "Vinyl chloride", "halogenated"),
            
            # Amines
            (6329, "Methylamine", "amine"),
            (6341, "Ethylamine", "amine"),
            (6104, "Aniline", "amine"),
            (700, "Ethanolamine", "amine"),
            
            # Nitriles
            (6342, "Acetonitrile", "nitrile"),
            (7855, "Acrylonitrile", "nitrile"),
            
            # Sulfur compounds
            (679, "DMSO", "sulfur"),
            (1068, "Carbon disulfide", "sulfur"),
            
            # Others
            (784, "Hydrogen peroxide", "oxidizer"),
            (962, "Water", "solvent"),
            (222, "Ammonia", "inorganic"),
            (280, "Carbon dioxide", "inorganic"),
            (297, "Urea", "nitrogen"),
        ]
    
    def download(self):
        """Download industrial chemicals by CID"""
        print("\n" + "="*70)
        print(" DOWNLOADING INDUSTRIAL CHEMICALS BY CID")
        print("="*70)
        
        seen_cids = set()
        
        for cid, common_name, category in tqdm(self.industrial_cids, desc="Industrial Chemicals"):
            if cid in seen_cids:
                continue
                
            try:
                compound = pcp.Compound.from_cid(cid)
                if compound:
                    data = self._extract_data(compound, common_name, category)
                    if data:
                        self.compounds.append(data)
                        seen_cids.add(cid)
                
                time.sleep(0.1)
                
            except Exception as e:
                continue
        
        print(f"\n Industrial chemicals download: {len(self.compounds)} compounds")
        return self.compounds
    
    def _extract_data(self, compound, common_name, category):
        """Extract data from compound"""
        try:
            smiles = getattr(compound, 'smiles', None) or getattr(compound, 'isomeric_smiles', None)
            
            if not smiles:
                return None
            
            # Prefer common name
            name = common_name
            if not name and compound.iupac_name:
                name = compound.iupac_name
            elif not name and compound.synonyms:
                name = compound.synonyms[0]
            else:
                name = f"CID-{compound.cid}"
            
            data = {
                'source': 'PubChem-Industrial',
                'source_id': f"CID{compound.cid}",
                'name': name,
                'molecular_formula': getattr(compound, 'molecular_formula', None),
                'molecular_weight': getattr(compound, 'molecular_weight', None),
                'smiles': smiles,
                'canonical_smiles': smiles,
                'inchi': getattr(compound, 'inchi', None),
                'inchikey': getattr(compound, 'inchikey', None),
                'iupac_name': getattr(compound, 'iupac_name', None),
                'synonyms': '|'.join(compound.synonyms[:10]) if compound.synonyms else '',
                'search_category': category,
                'xlogp': getattr(compound, 'xlogp', None),
                'exact_mass': getattr(compound, 'exact_mass', None),
                'monoisotopic_mass': getattr(compound, 'monoisotopic_mass', None),
                'tpsa': getattr(compound, 'tpsa', None),
                'complexity': getattr(compound, 'complexity', None),
                'charge': getattr(compound, 'charge', None),
                'h_bond_donor_count': getattr(compound, 'h_bond_donor_count', None),
                'h_bond_acceptor_count': getattr(compound, 'h_bond_acceptor_count', None),
                'rotatable_bond_count': getattr(compound, 'rotatable_bond_count', None),
                'heavy_atom_count': getattr(compound, 'heavy_atom_count', None),
                'atom_stereo_count': getattr(compound, 'atom_stereo_count', None),
                'defined_atom_stereo_count': getattr(compound, 'defined_atom_stereo_count', None),
                'undefined_atom_stereo_count': getattr(compound, 'undefined_atom_stereo_count', None),
                'bond_stereo_count': getattr(compound, 'bond_stereo_count', None),
                'covalent_unit_count': getattr(compound, 'covalent_unit_count', None),
            }
            
            return data
            
        except Exception as e:
            return None


# DATASET MERGER & DEDUPLICATOR

class DatasetMerger:
    """Merge and deduplicate datasets from multiple sources"""
    
    def __init__(self):
        self.all_compounds = []
        self.seen_smiles = set()
        self.seen_inchikeys = set()
    
    def add_compounds(self, compounds, source_name):
        """Add compounds with deduplication"""
        added = 0
        duplicates = 0
        
        for compound in compounds:
            smiles = compound.get('canonical_smiles') or compound.get('smiles')
            inchikey = compound.get('inchikey')
            
            # Check for duplicates
            is_duplicate = False
            if smiles and smiles in self.seen_smiles:
                is_duplicate = True
            if inchikey and inchikey in self.seen_inchikeys:
                is_duplicate = True
            
            if not is_duplicate:
                self.all_compounds.append(compound)
                if smiles:
                    self.seen_smiles.add(smiles)
                if inchikey:
                    self.seen_inchikeys.add(inchikey)
                added += 1
            else:
                duplicates += 1
        
        print(f"   {source_name}: Added {added}, Duplicates skipped: {duplicates}")
    
    def get_dataframe(self):
        """Convert to pandas DataFrame"""
        df = pd.DataFrame(self.all_compounds)
        
        # Add metadata columns
        df['download_date'] = datetime.now().strftime('%Y-%m-%d')
        df['dataset_version'] = '1.1'
        
        return df
    
    def print_statistics(self, df):
        """Print dataset statistics"""
        print("\n" + "="*70)
        print(" UNIFIED DATASET STATISTICS")
        print("="*70)
        
        print(f"\n Total Compounds: {len(df)}")
        print(f" Unique SMILES: {df['smiles'].nunique()}")
        print(f" Total Columns: {len(df.columns)}")
        
        print(f"\n By Source:")
        source_counts = df['source'].value_counts()
        for source, count in source_counts.items():
            pct = count / len(df) * 100
            print(f"   - {source}: {count} ({pct:.1f}%)")
        
        print(f"\n By Search Category (top 15):")
        if 'search_category' in df.columns:
            cat_counts = df['search_category'].value_counts().head(15)
            for cat, count in cat_counts.items():
                print(f"   - {cat}: {count}")
        
        print(f"\n Data Completeness:")
        important_cols = ['name', 'smiles', 'molecular_weight', 'xlogp', 'h_bond_donor_count']
        for col in important_cols:
            if col in df.columns:
                non_null = df[col].notna().sum()
                pct = non_null / len(df) * 100
                print(f"   - {col}: {non_null}/{len(df)} ({pct:.1f}%)")


# MAIN EXECUTION

def main():

    # Create output directory
    os.makedirs(CONFIG['output_dir'], exist_ok=True)
    
    # Initialize merger
    merger = DatasetMerger()
    
    # Download Industrial Chemicals FIRST (highest priority)
    industrial = IndustrialChemicalsDownloader()
    industrial_compounds = industrial.download()
    merger.add_compounds(industrial_compounds, "Industrial Chemicals")
    
    # Download from PubChem
    pubchem = PubChemDownloader()
    pubchem_compounds = pubchem.download()
    merger.add_compounds(pubchem_compounds, "PubChem")
    
    # Download from ChEMBL
    chembl = ChEMBLDownloader()
    chembl_compounds = chembl.download()
    merger.add_compounds(chembl_compounds, "ChEMBL")
    
    # Convert to DataFrame
    print("\n" + "="*70)
    print("MERGING DATASETS")
    print("="*70)
    
    df = merger.get_dataframe()
    
    # Print statistics
    merger.print_statistics(df)
    
    # Save to CSV
    output_path = os.path.join(CONFIG['output_dir'], CONFIG['output_filename'])
    df.to_csv(output_path, index=False)
    
    print("\n" + "="*70)
    print(" DOWNLOAD COMPLETE!")
    print("="*70)
    print(f"\n Output saved to: {output_path}")
    print(f" Total compounds: {len(df)}")
       
    return df


if __name__ == "__main__":
    df = main()